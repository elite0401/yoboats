import angular from 'angular';
import angularMeteor from 'angular-meteor';
import angularMeteorAuth from 'angular-meteor-auth';
import uiRouter from 'angular-ui-router';

import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {Roles} from 'meteor/alanning:roles';

import template from './template.html';
import viewTemplate from './view.html';

import {AdFormFields} from '../../../api/ad-form-fields';
import {SocialNetworks} from '../../../api/social-networks';

class ListingA {
	constructor($scope, $reactive, $state, $uibModal) {
		'ngInject';

		this.$state = $state;

		$reactive(this).attach($scope);

		this.subscribe('social-networks');

		this.helpers({
			socialNetworks() {
				return SocialNetworks.find();
			}
		});
	}

	logout() {
		Meteor.logout(() => {
			this.$state.go('landing.landing');
		});
	}
}

class ListingView {
	constructor($scope, $reactive, $sce, Notification, listing) {
		'ngInject';

		$reactive(this).attach($scope);

		if(listing.video) {
			this.video = {
				poster: 'http://res.cloudinary.com/' + Meteor.settings.public.cloudinary.cloudName + '/video/upload/' + listing.video.public_id + '.jpg',
				url: $sce.trustAsResourceUrl(listing.video.url)
			};
		}

		this.not = Notification;
		this.contact = {};
		this.listing = listing;
		this.mainPhoto = (ad => {
			if(!ad.photos || ad.photos.length < 1){
				return '/noPhoto.png';
			}

			return Meteor.settings.public.awsUrl + ad._id + '/' + ad.photos[0];
		})(listing);
		this.galleryImage = true;
		this.galleryVideo = false;

		this.subscribe('ad-form-fields');

		this.helpers({
			adFormFields() {
				return AdFormFields.find();
			}
		});

		this.captchaResponse = null;
		this.captcha = {publicKey: Meteor.settings.public.recaptcha};
	}

	setResponse(response) {
		this.captchaResponse = response;
	}

	cbExpiration() {
		this.captchaResponse = null;
	}

	setMainPhoto(type, url) {
		switch (type) {
			case 'image':
				this.galleryImage = true;
				this.galleryVideo = false;
				this.mainPhoto = url;
			break;
			case 'video':
				this.galleryImage = false;
				this.galleryVideo = true;
			break;
		}
	}

	contactHim(form) {
		this.call('captchaVerify', this.captchaResponse, (err, res) => {
			if(err) {
				return alert(err.message);
			}

			this.call('contactSeller', _.extend({userId: this.listing.userId}, this.contact), (err, res) => {
				if(err) {
					return this.not.error({message: 'Email not sent, ' + err.reason});
				}

				this.not.success({message: 'Email sent'});
				this.contact = {};
				form.setPristine();
			});
		})
	}
}

const name = 'listing';

export default name;

angular.module(name, [angularMeteor, uiRouter, angularMeteorAuth])
.config($stateProvider => {
	'ngInject';

	$stateProvider.state('listing', {
		abstract: true,
		url: '/listing',
		template,
		controller: ListingA,
		controllerAs: 'l'
	})
	.state('listing.view', {
		url: '/:_id',
		template: viewTemplate,
		controllerAs: 'lv',
		controller: ListingView,
		resolve: {
			listing($stateParams, $q) {
				'ngInject';

				const d = $q.defer();

				Meteor.call('listings.get', $stateParams._id, (err, res) => {
					if(err) {
						d.reject(err.reason);
					} else {
						d.resolve(res);
					}
				})

				return d.promise;
			}
		}
	})
});
