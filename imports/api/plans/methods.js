import {Meteor} from 'meteor/meteor';
import {Random} from 'meteor/random';
import {Roles} from 'meteor/alanning:roles';
import {check} from 'meteor/check';
import {stripe} from 'meteor/stripe';

import {Plans} from './collection';

if (Meteor.isServer) {
	Meteor.methods({
		'plans.insert': function(plan) {
			if(!Meteor.user()) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			if(!Roles.userIsInRole(Meteor.userId(), 'admin')) {
				throw new Meteor.Error(403, 'Forbidden');
			}

			const amount = Math.floor(Number(plan.amount) * 100).toString();

			plan._id = Random.id();
			plan.active = true;

			try {
				const result = stripe.plans.create({
					amount,
					interval_count: plan.interval,
					interval: plan.period,
					name: plan.name,
					currency: "usd",
					id: plan._id,
					trial_period_days: plan.trial
				});
			} catch(err) {
				throw new Meteor.Error("stripe-error", err.message);
			}

			Plans.insert(plan);
		},
		"plans.editPublicationsAllowed": function(_id, publicationsAllowed) {
			check(publicationsAllowed, Number);

			if(!Meteor.user()) {
				throw new Meteor.Error(401, 'Authentication required');
			}
			if(!Roles.userIsInRole(Meteor.userId(), 'admin')) {
				throw new Meteor.Error(403, 'Forbidden');
			}

			Plans.update({_id}, {$set: {publicationsAllowed}});
		},
		"plans.remove": function(_id) {
			if(!Meteor.user()) {
				throw new Meteor.Error(401, 'Authentication required');
			}
			if(!Roles.userIsInRole(Meteor.userId(), 'admin')) {
				throw new Meteor.Error(403, 'Forbidden');
			}
			if(Plans.find({_id}).count() == 0) {
				throw new Meteor.Error(404, 'Plan not found');
			}
			if (Meteor.users.find({"profile.plan": _id}).count()>0) {
				throw new Meteor.Error(403, 'There are users subscribed in this plan, you can\'t remove it');
			}

			try {
				const result = stripe.plans.del(_id);
			} catch(err) {
				throw new Meteor.Error("stripe-error", err.message);
			}

			Plans.remove({_id});
		},
		"plans.activate": function(_id) {
			if(!Meteor.user()) {
				throw new Meteor.Error(401, 'Authentication required');
			}
			if(!Roles.userIsInRole(Meteor.userId(), 'admin')) {
				throw new Meteor.Error(403, 'Forbidden');
			}

			const plan = Plans.findOne({_id});
			if(!plan) {
				throw new Meteor.Error(404, 'Plan not found');
			}

			Plans.update({_id}, {$set: {active: !plan.active}});
		},
		"plans.public": function(_id){
			if(!Meteor.user()) {
				throw new Meteor.Error(401, 'Authentication required');
			}
			if(!Roles.userIsInRole(Meteor.userId(), 'admin')) {
				throw new Meteor.Error(403, 'Forbidden');
			}

			const plan = Plans.findOne({_id});
			if(!plan) {
				throw new Meteor.Error(404, 'Plan not found');
			}

			Plans.update({_id}, {$set: {public: !plan.public}});
		}
	});
}
