import {Meteor} from 'meteor/meteor';
import {FacebookGraph} from 'meteor/facebook-graph';

import getPhoto from '../get-photo';

import {FacebookAds} from './collection';
import {Listings} from '../listings';
import {checkUser} from '../user-utils';

if(Meteor.isServer) {
	Meteor.methods({
		'facebook-ads.create': function(message, listingIds) {
			checkUser(Meteor.userId(), 'admin');

			const FB = new FacebookGraph({accessToken: Meteor.user().services.facebook.accessToken}),
				data = {
					link: Meteor.absoluteUrl({rootUrl: 'http://www.yoboats.com'}),
					message,
					published: !Meteor.settings.public.sandbox,
					child_attachments: JSON.stringify(Listings.find({_id: {$in: listingIds}}, {fields: {name: 1, photos: 1, price: 1}}).map(listing => {
						return {
							link: Meteor.absoluteUrl('listing/' + listing._id, {rootUrl: 'http://www.yoboats.com'}),
							picture: getPhoto(listing),
							name: listing.name,
							description: '$ ' + listing.price
						};
					}))
				};

			const fbAd = FB.postFeed(Meteor.settings.facebook.pageId, data, true);

			FacebookAds.insert({
				_id: fbAd.id,
				listings: Listings.find({_id: {$in: listingIds}}, {fields: {name: 1}}).fetch(),
				data: data,
				creationDate: new Date()
			});

			const expiryDate = new Date();
			expiryDate.setDate(expiryDate.getDate() + 5);

			Listings.update({_id: {$in: listingIds}}, {$set: {fbPromotionExpires: expiryDate}, $unset: {pendingFBPromotion: true}});
		},
		'facebook-ads.search': function(query, options) {
			checkUser(Meteor.userId(), 'admin');

			query = query || {};
			options = options || {};

			return {
				ads: FacebookAds.find(query, options).fetch(),
				total: FacebookAds.find(query).count()
			};
		}
	});
}
