import crypto from 'crypto';
import s3 from 's3';
import cloudinary from 'cloudinary';

import {Meteor} from 'meteor/meteor';
import {Random} from 'meteor/random';
import {Roles} from 'meteor/alanning:roles';
import {check} from 'meteor/check';

import {Listings} from './collection';
import {Plans} from '../plans';

if(Meteor.isServer) {
	const s3Client = s3.createClient({
		s3Options: Meteor.settings.aws
	});

	function getUserEmail(user) {
		if(user.emails && _.isArray(user.emails) && user.emails.length>0) {
			return user.emails[0].address;
		}

		if(user.services) {
			if(user.services.facebook) {
				return user.services.facebook.email;
			}
		}
		return null;
	};

	Meteor.methods({
		'listing.sign-upload-policy': function(_id, ext) {
			check(_id, String);
			check(ext, String);

			if(!Meteor.user()) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			function formatNumber(num, digits) {
				const string = String(num);

				return Array(digits - string.length + 1).join("0").concat(string);
			}

			function hmac256(key, data, encoding) {
				return crypto.createHmac('sha256', key)
					.update(new Buffer(data, 'utf-8'))
					.digest(encoding);
			}

			let date = new Date();
			date.setHours(date.getHours()+1);

			const filename = Random.id() + '.' + ext,
				today = date.getUTCFullYear() + formatNumber(date.getUTCMonth() + 1, 2) + formatNumber(date.getUTCDate(), 2),
				credential = [Meteor.settings.aws.accessKeyId, today, Meteor.settings.aws.region, 's3', 'aws4_request'].join('/'),
				dateKey = hmac256('AWS4' + Meteor.settings.aws.secretAccessKey, today),
				dateRegionKey = hmac256(dateKey, Meteor.settings.aws.region),
				dateRegionServiceKey= hmac256(dateRegionKey, 's3'),
				signingKey = hmac256(dateRegionServiceKey, 'aws4_request');

			const policy = Buffer(JSON.stringify({
				expiration: date.toISOString(),
				conditions: [
					{bucket: Meteor.settings.aws.bucket},
					{key: _id + '/' + filename},
					{acl: 'public-read'},
					['starts-with', '$Content-Type', 'image/'],
					{'x-amz-credential': credential},
					{'x-amz-algorithm': 'AWS4-HMAC-SHA256'},
					{'x-amz-date': today + "T000000Z"}
				]
			}), 'utf-8').toString('base64');

			const formData = [
				{key: _id + '/' + filename},
				{acl: 'public-read'},
				{'X-Amz-Algorithm': 'AWS4-HMAC-SHA256'},
				{'X-Amz-Credential': credential},
				{'X-Amz-Date': today + 'T000000Z'},
				{Policy: policy},
				{'x-amz-signature': hmac256(signingKey, policy, 'hex')}
			];

			return {
				// As per http://stackoverflow.com/questions/19327410/fine-uploader-to-s3-bucket-getting-405-method-not-allowed-error
				url: 'http://' + Meteor.settings.aws.bucket + '.s3-' + Meteor.settings.aws.region + '.amazonaws.com/',
				formData: formData,
				filename: filename
			};
		},
		'listings.search': function(query, options) {
			query = query || {};
			options = options || {};

			if(!query.userId) {
				query.published = true;
			}

			return {
				listings: Listings.find(query, options).fetch(),
				total: Listings.find(query).count()
			};
		},
		'listings.search_old': function(query, options) {
			query = query || {};
			options = options || {};

			options.fields = {_id: 1};

			if(!query.userId) {
				query.published = true;
			}

			return Listings.find(query, options).fetch().map(item => {
				return item._id;
			});
		},
		'listings.search-admin': function(query, options){
			if (!Roles.userIsInRole(Meteor.userId(), 'admin')) throw new Meteor.Error(403, 'Forbidden');

			query = query || {};
			options = options || {};

			return {
				listings: Listings.find(query, options).fetch(),
				total: Listings.find(query).count()
			}
		},
		'listings.publish': function(_id) {
			const user = Meteor.user();
			if(!user) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			const ad = Listings.findOne({_id, userId: user._id});
			if(!ad) {
				throw new Meteor.Error(404, 'Boat ad not found');
			}

			if(ad.published) {
				Listings.update({_id: ad._id}, {$set:{published: false}});
				return;
			}

			if(!user.profile || !user.profile.plan) {
				throw new Meteor.Error(403, 'You need a subscription to be able to publish your boats');
			}

			const plan = Plans.findOne({_id: user.profile.plan});
			if(!plan) {
				throw new Meteor.Error(403, 'Your subscription plan no longer exists');
			}

			//if no more publish allowed...
			const publishedAds = Listings.find({userId: user._id, published: true}).count();
			if(publishedAds>=plan.publicationsAllowed) {
				throw new Meteor.Error(403, "You can't publish more boats with your current subscription");
			}

			Listings.update({_id: ad._id}, {$set:{published: !ad.published}});

			// Send an email to notify the publication
			// of a new boat ad
			Email.send({
				from: Meteor.settings.mail.from,
				to: Meteor.settings.notifications.mail,
				subject: "Yoboats new ad published.",
				text: 'The user: ' + getUserEmail(user) +
					' haz published the boat: ' + ad.name +
					' yoboats.com/listing/' + ad._id
			});
		},
		'listings.promote': function(_id) {
			const user = Meteor.user();
			if(!user) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			const ad = Listings.findOne({_id: _id, userId: user._id});
			if(!ad) {
				throw new Meteor.Error(404, 'Boat ad not found');
			}

			if(ad.pendingFBPromotion || (ad.fbPromotionExpires && ad.fbPromotionExpires.getTime()>(new Date()).getTime())) {
				throw new Meteor.Error(400, 'Ad is already promoted');
			}

			if(!user.profile.stripeid) {
				throw new Meteor.Error(400, 'You don\'t have a credit card on file. Please add one before proceeding.');
			}

			try {
				stripe.charges.create({
					amount: 2500,
					currency: 'usd',
					description: 'Ad promotion for: ' + ad.name,
					customer: user.profile.stripeid
				});
			} catch(err) {
				throw new Meteor.Error("stripe-error", err.message);
			}

			Listings.update(_id, {$set: {pendingFBPromotion: true}});
		},
		'listings.get': function(_id) {
			return Listings.findOne(_id);
		},
		'listings.remove': function(_id) {
			const user = Meteor.user();
			if(!user) {
				throw new Meteor.Error(401, 'Authentication required');
			}

			const ad = Listings.findOne({_id: _id, userId: user._id}, {fields: {photos: 1, video: 1}});
			if(!ad) {
				throw new Meteor.Error(404, 'Boat ad not found');
			}

			if(ad.video) {
				try {
					cloudinary.uploader.destroy(ad.video.public_id);
				} catch(e) {
					throw new Meteor.Error(e);
				}
			}

			if(ad.photos.length>0) {
				s3Client.deleteObjects({
					Bucket: Meteor.settings.aws.bucket,
					Delete: {
						Objects: ad.photos.map(p => {
							return {Key: ad._id + '/' + p};
						})
					}
				});
			}

			Listings.remove(_id);
		}
	});
}
