import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {Roles} from 'meteor/alanning:roles';
import {stripe} from 'meteor/stripe';

import {Plans} from './plans';
import {Listings} from './listings';
import {getUserEmail} from './user-utils';

const RegisterUserSchema = new SimpleSchema({
	name: {
		type: String,
		min: 1
	},
	email: {
		type: String,
		regEx: SimpleSchema.RegEx.Email
	},
	password: {
		type: String,
		min: 1
	}
});

if(Meteor.isServer) {
	Meteor.users.after.insert(function(userId, doc){
		Roles.addUsersToRoles(this._id, ['user']);
	});

	Meteor.users.allow({
		insert: function(userId, doc){
			if (Meteor.user() && Roles.userIsInRole(Meteor.userId(), 'admin')) {
				return true;
			}
		},
		update: function(userId, doc, fields, modifier) {
			return Roles.userIsInRole(Meteor.userId(), 'admin');
		},
		remove: function(userId, doc, fields, modifier) {
			if (Meteor.user() && Roles.userIsInRole(Meteor.userId(), 'admin')) {
				return true;
			}
		}
	});

	Meteor.methods({
		'seller.info': function(_id) {
			const user = Meteor.users.findOne(_id);

			return  {
				email: getUserEmail(user),
				name: user.profile.name
			};
		},
		'seller.listing': function(_id) {
			return Listings.find({userId: _id, published: true}).fetch();
		},
		'addToAdmin': function(userId) {
			if(!Meteor.userId()) {
				throw new Meteor.Error(401, 'Authentication required');
			}
			if(!Roles.userIsInRole(Meteor.userId(), 'admin')) {
				throw new Meteor.Error(403, 'Forbidden');
			}

			Roles.addUsersToRoles(userId, 'admin');
		},
		'user.update': function(user) {
			if(!Meteor.userId()) {
				throw new Meteor.Error(401, 'Authentication required');
			}
			if(!Roles.userIsInRole(Meteor.userId(), 'admin')) {
				throw new Meteor.Error(403, 'Forbidden');
			}

			const oldUser = Meteor.users.findOne({_id: user._id}),
				changes = {};

			if(oldUser.profile.name!=user.profile.name) {
				changes["profile.name"] = user.profile.name;
			}

			if(oldUser.emails[0].address != user.emails[0].address){
				changes["emails.0.address"] = user.emails[0].address;
			}

			if(oldUser.profile.plan!=user.profile.plan) {
				try	{
					const plan = Plans.findOne({_id: user.profile.plan});
					if(!plan) {
						throw new Meteor.Error(404, 'Plan not found');
					}

					const as = stripe.customers.listSubscriptions(user.profile.stripeid);
					if(as.data.length>0) {
						_.each(as.data, subscription => {
							stripe.customers.cancelSubscription(user.profile.stripeid, subscription.id);
						});
					}

					const result = stripe.customers.createSubscription(user.profile.stripeid, {plan: user.profile.plan});

					Meteor.users.update({_id: user._id}, {$set: {'profile.plan': user.profile.plan}});

					const publications = Listings.find({userId: user._id, published: true});

					while(publications.fetch().length>plan.publicationsAllowed) {
						Listings.update({_id: publications.fetch[0]._id}, {$set: {published: false}});
					}
				} catch(err) {
					throw new Meteor.Error("stripe-error", err.message);
				}
			}

			Meteor.users.update({_id: oldUser._id}, {$set: changes});
		},
		'user.register': function(user) {
			check(user, RegisterUserSchema);

			user.email = user.email.toLowerCase();

			const _id = Accounts.createUser({
				email: user.email,
				password: user.password
			});

			Meteor.users.update({_id: _id}, {$set: {profile: {name: user.name}}});

			Accounts.sendVerificationEmail(_id);
		},
		'user.changeName': function(newName) {
			if(!Meteor.userId()) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			Meteor.users.update({_id: Meteor.userId()}, {$set: {'profile.name': newName}});
		},
		'user.addFavorite': function(listingId) {
			check(listingId, String);

			if(!Meteor.userId()) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			const user = Meteor.users.findOne({_id: Meteor.userId()});

			if(Listings.find().count()<1) {
				throw new Meteor.Error(400, 'Sorry, this boat is no longer available');
			}

			if(_.find(user.profile.favorites, function (favId){ return favId == listingId})) {
				Meteor.users.update({_id: user._id}, {$pull: {'profile.favorites': listingId}});
				return;
			}

			Meteor.users.update({_id: user._id}, {$addToSet: {'profile.favorites': listingId}});
		},
		'user.customer-data': function() {
			const user = Meteor.user();

			if(!user) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			if(!user.profile.stripeid) {
				const result = stripe.customers.create({
					description: "Customer " + user.profile.name + " from yoboats.com"
				});

				Meteor.users.update({_id: user._id}, {$set: {'profile.stripeid': result.id}});

				user.profile.stripeid = result.id;
			}

			try {
				return stripe.customers.retrieve(user.profile.stripeid);
			} catch(err) {
				throw new Meteor.Error('stripe-error', err.message);
			}
		},
		'user.subscribeToPlan': function(planId) {
			const user = Meteor.user();

			if(!user) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			const plan = Plans.findOne({_id: planId});

			if(!plan) {
				throw new Meteor.Error(400, 'Plan not found');
			}

			try	{
				stripe.customers.createSubscription(user.profile.stripeid, {plan: planId});

				Meteor.users.update({_id: user._id}, {$set: {'profile.plan': planId, 'profile.authorized': true}});
			} catch(err) {
				throw new Meteor.Error("stripe-error", err.message);
			}
		},
		'user.updateSubscription': function(subId, planId) {
			const user = Meteor.user();

			if(!user) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			const plan = Plans.findOne({_id: planId});

			if(!plan) {
				throw new Meteor.Error(400, 'Plan not found');
			}

			try {
				stripe.customers.updateSubscription(user.profile.stripeid, subId, {plan: planId});

				Meteor.users.update({_id: user._id}, {$set: {'profile.plan': planId, 'profile.authorized': true}});
			} catch(err) {
				throw new Meteor.Error("stripe-error", err.message);
			}
		},
		'user.removeSubscription': function() {
			if(!Meteor.userId()) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			const user = Meteor.users.findOne({_id: Meteor.userId()});

			try {
				const as = stripe.customers.listSubscriptions(user.profile.stripeid);
				if(as.data.length>0) {
					_.each(as.data, function(subscription) {
						stripe.customers.cancelSubscription(user.profile.stripeid, subscription.id);
					});
				}

				Meteor.users.update({_id: user._id}, {$unset: {'profile.plan': "", 'profile.authorized': false}});

				Listings.update({$and: [{userId: user._id}, {published: true}]}, {$set: {published: false}});
			} catch(err) {
				throw new Meteor.Error("stripe-error", err.message);
			}
		},
		'user.addCard': function(creditCard) {
			if(!Meteor.userId()) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			const user = Meteor.users.findOne({_id: Meteor.userId()});

			try	{
				stripe.customers.createSource(user.profile.stripeid, {source: creditCard.id});
			} catch(err) {
				throw new Meteor.Error("stripe-error", err.message);
			}
		},
		'user.removeCard': function(cardId) {
			const user = Meteor.user();

			if(!user) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			try	{
				stripe.customers.deleteCard(user.profile.stripeid, cardId);
			} catch(err) {
				throw new Meteor.Error("stripe-error", err.message);
			}
		},
		'user.setDefaultCard': function(cardId) {
			const user = Meteor.user();

			if(!user) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			try	{
				stripe.customers.update(user.profile.stripeid, {default_source: cardId});
			} catch(err) {
				throw new Meteor.Error("stripe-error", err.message);
			}
		},
		'user.search': function(filter, options) {
			if(!Meteor.userId()) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			if(!Roles.userIsInRole(Meteor.userId(), 'admin')) {
				throw new Meteor.Error(403, 'Forbidden');
			}

			const query = {};

			return {
				total: Meteor.users.find(query).count(),
				users: Meteor.users.aggregate([
					{$match: query},
					{$sort: options.sort},
					{$skip: options.skip},
					{$limit: options.limit},
//					{$lookup: {from: 'plans', localField: 'profile.plan', foreignField: '_id', as: 'plan'}},
//					{$unwind: {path: '$plan', preserveNullAndEmptyArrays: true}}
				])
			};
		}
	});
}
