import _ from 'underscore';
import angular from 'angular';
import angularMeteor from 'angular-meteor';
import angularMeteorAuth from 'angular-meteor-auth';
import uiRouter from 'angular-ui-router';

import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {Roles} from 'meteor/alanning:roles';

import template from './template.html';
import indexTemplate from './index.html';
import socialNetworksTemplate from './social-networks.html';
import usersManageTemplate from './users-manage.html';
import adsManageTemplate from './ads-manage.html';
import adFormSettingsTemplate from './ad-form-settings.html';
import paymentSettingsTemplate from './payment-settings.html';
import editListingTemplate from './edit-listing.html';
import editUserTemplate from './edit-user.html';
import confirmRemoveUserTemplate from './confirm-remove-user.html';
import confirmPromoteUserTemplate from './confirm-promote-user.html';
import newPlanTemplate from './new-plan.html';
import editPlanTemplate from './edit-plan.html';
import removePlanTemplate from './remove-plan.html';
import newFieldTemplate from './new-field.html';
import facebookAdsTemplate from './facebook-ads.html';
import facebookCreateAdTemplate from './facebook-create-ad.html';

import {BoatCategories} from '../../../api/boat-categories';
import {Manufacturers} from '../../../api/manufacturers';
import {AdFormFields} from '../../../api/ad-form-fields';
import {SocialNetworks} from '../../../api/social-networks';
import {Plans} from '../../../api/plans';
import {FacebookAds} from '../../../api/facebook-ads';

class Admin {
	constructor($scope, $reactive, $auth, $state) {
		'ngInject';

		this.$state = $state;

		$reactive(this).attach($scope);

		$auth.awaitUser().then(user => {
			if(!Roles.userIsInRole(user, 'admin')) {
				return $state.go('login.login');
			}

			if(user.username!='admin') {
				Meteor.loginWithFacebook({requestPermissions: ['manage_pages,publish_pages']});
			}
		}, () => {
			$state.go('login.login');
		});

		this.helpers({
			user() {
				return Meteor.user();
			}
		});
	}

	logout() {
		Meteor.logout(() => {
			this.$state.go('login.login');
		});
	}
}

class AdminIndex {
	constructor($scope, $reactive) {
		'ngInject';

		$reactive(this).attach($scope);

		this.subscribe('admin');

		this.helpers({
			listingsCount() {
				return Counts.findOne('listings');
			},
			userCount() {
				return Counts.findOne('users');
			}
		});
	}
}

class SocialNetworksCtrl {
	constructor($scope, $reactive, Notification) {
		'ngInject';

		this.not = Notification;

		$reactive(this).attach($scope);

		this.subscribe('social-networks');

		this.helpers({
			socialNetworks() {
				return SocialNetworks.find();
			}
		});
	}

	save(toggle) {
		this.socialNetworks.forEach(sn => {
			SocialNetworks.update(sn._id, {$set: _.pick(sn, 'active', 'url')});
		});

		if(!toggle) {
			this.not.success({message: 'Social networks updated'});
		}
	}
}

class UsersManage {
	constructor($scope, $reactive, $uibModal, Notification) {
		'ngInject';

		this.not = Notification;
		this.$uibModal = $uibModal;

		$reactive(this).attach($scope);

		this.subscribe('plans');

		this.pagination = {
			page: 1,
			total: 0
		};
		this.users = [];

		$scope.$watch('pagination.page', () => {
			this.search();
		});
	}

	search() {
		const options = {
			limit: 10,
			skip: (this.pagination.page - 1) * 10,
			sort: {'profile.name': 1}
		};

		this.call('user.search', '', options, (err, res) => {
			if(err) {
				return alert(err.reason || err.message);
			}

			this.pagination.total = res.total;
			this.users = res.users;
		});
	}

	isAdmin(user) {
		return _.contains(user.roles, 'admin');
	}

	edit(user) {
		this.$uibModal.open({
			template: editUserTemplate,
			controller: ($scope) => {
				'ngInject';

				$scope.user = angular.copy(user);
				$scope.plans = Plans.find({active: true}).fetch();
			}
		}).result.then(u => {
			u._id = user._id;

			Meteor.call('user.update', u, err => {
				if(err) {
					this.not.error({message: 'Error while saving, please try again later'});
					return;
				}

				this.not.success({message: 'User updated'});
				this.search();
			});
		});
	}

	remove(user) {
		this.$uibModal.open({
			template: confirmRemoveUserTemplate
		}).result.then(() => {
			Meteor.users.remove(user._id, err => {
				if(err) {
					this.not.error({message: "Error, try again later", delay: 2000});
					return;
				}

				this.not.success({message: "User removed", delay: 2000});
				this.search();
			});
		});
	}

	promote(user) {
		this.$uibModal.open({
			template: confirmPromoteUserTemplate
		}).result.then(() => {
			Meteor.call('addToAdmin', user._id, err => {
				if(err) {
					this.not.error({message: 'Error, try again later', delay: 2000});
					return;
				}

				this.not.success({message: 'User promoted', delay: 2000});
				this.search();
			});
		});
	}

	getPlan(planId) {
		const plan = Plans.findOne(planId);

		return plan? plan.name : '';
	}
}

class AdsManage {
	constructor($scope, $reactive, $uibModal, Notification) {
		'ngInject';

		this.not = Notification;
		this.$uibModal = $uibModal;

		$reactive(this).attach($scope);

		this.pagination = {
			page: 1,
			total: 0
		};
		this.listings = [];

		$scope.$watch('pagination.page', () => {
			this.search();
		});
	}

	search() {
		const options = {
			limit: 10,
			skip: (this.pagination.page - 1) * 10,
			sort: {'profile.name': 1}
		};

		this.call('listings.search-admin', {}, options, (err, res) => {
			if(err) {
				return alert(err.reason || err.message);
			}

			this.pagination.total = res.total;
			this.listings = res.listings;
		});
	}

	remove(ad) {
		if(!confirm('Are you sure you want to remove this ad?')) {
			return;
		}

		Listings.remove(ad._id, err => {
			if(err) {
				return alert('Error, try again later');
			}

			alert('Ad removed');
			this.search();
		});
	}
}

class FormSettings {
	constructor($scope, $reactive, $uibModal, Notification) {
		'ngInject';

		$reactive(this).attach($scope);

		this.$uibModal = $uibModal;
		this.not = Notification;
		this.subscribe('ad-form-fields');

		this.helpers({
			adFormFields() {
				return AdFormFields.find();
			}
		});
	}

	newField() {
		this.$uibModal.open({
			template: newFieldTemplate,
			controller($scope) {
				'ngInject';

				$scope.newField = {
					optional: true,
					active: true,
					order: 0
				};

				$scope.$watch('newField.type', type => {
					if(type=='Options') {
						$scope.newField.options = [''];
					} else if($scope.newField.options) {
						delete $scope.newField.options;
					}
				});
			}
		}).result.then(newField => {
			newField.model = newField.name.toLowerCase().replace(/[^A-Z0-9-/ /]+/ig, '').replace(/ /g, '_');

			if(AdFormFields.findOne({model: newField.model})) {
				return this.not.error({message: 'Please assign another name to the field, not saved'});
			}

			AdFormFields.insert(newField, err => {
				if(err) {
					this.not.error({message: 'Error while saving, please try again later'});
				} else {
					this.not.success({message: 'Ad form field created'});
				}
			});
		});
	}

	edit(field) {
		this.$uibModal.open({
			template: newFieldTemplate,
			controller($scope) {
				'ngInject';

				$scope.newField = angular.copy(field);

				$scope.$watch('newField.type', type => {
					if(type=='Options') {
						$scope.newField.options = [''];
					} else if($scope.newField.options) {
						delete $scope.newField.options;
					}
				});
			}
		}).result.then(newField => {
			AdFormFields.update(field._id, {$set: _.pick(newField, 'name', 'order', 'type', 'optional', 'active', 'options')}, err => {
				if(err) {
					this.not.error({message: 'Error while saving, please try again later'});
				} else {
					this.not.success({message: 'Ad form field updated'});
				}
			});
		});
	}

	remove(field) {
		if(!confirm('Are you sure you want to remove this form field?')) {
			return;
		}

		AdFormFields.remove(field._id, err => {
			if(err) {
				this.not.error({message: 'Error, please try again later'});
			} else {
				this.not.success({message: 'Ad form field removed'});
			}
		});
	}
}

class PaymentSettings {
	constructor($scope, $reactive, $uibModal) {
		'ngInject';

		$reactive(this).attach($scope);

		this.$uibModal = $uibModal;
		this.subscribe('plans');

		this.helpers({
			plans() {
				return Plans.find();
			}
		});
	}

	newPlan() {
		this.$uibModal.open({
			template: newPlanTemplate,
			controllerAs: 'np',
			controller($scope, $reactive) {
				'ngInject';

				$reactive(this).attach($scope);

				this.newPlan = {
					public: true,
					trial: 0,
					period: 'month',
					publicationsAllowed: 1
				};
			}
		}).result.then(newPlan => {
			Meteor.call('plans.insert', newPlan, err => {
				if(err) {
					return alert(err.reason || err.message);
				}

				alert('Plan saved');
			});
		});
	}

	edit(plan) {
		this.$uibModal.open({
			template: editPlanTemplate,
			controllerAs: 'ep',
			controller($scope, $reactive) {
				'ngInject';

				$reactive(this).attach($scope);

				this.plan = plan;
			}
		}).result.then(plan => {
			Meteor.call('plans.editPublicationsAllowed', plan._id, plan.publicationsAllowed, err => {
				if(err) {
					return alert(err.reason || err.message);
				}

				alert('Plan updated');
			});
		});
	}

	activate(plan) {
		Meteor.call('plans.activate', plan._id);
	}

	makePublic(plan) {
		Meteor.call('plans.public', plan._id);
	}

	remove(plan) {
		this.$uibModal.open({
			template: removePlanTemplate
		}).result.then(() => {
			Meteor.call('plans.remove', plan._id, err => {
				if(err) {
					return alert(err.rreason || err.message);
				}

				alert('Plan remove');
			});
		})
	}
}

class EditListing {
	constructor($scope, $reactive, $uibModal, $state, $q, FileUploader, Notification, listing) {
		'ngInject';

		$reactive(this).attach($scope);

		this.$uibModal = $uibModal;
		this.$state = $state;
		this.$q = $q;
		this.uploader = new FileUploader({});
		this.not = Notification;
		this.listing = listing;
		this.loading = false;

		this.subscribe('boat-categories');
		this.subscribe('manufacturers');
		this.subscribe('ad-form-fields');

		this.helpers({
			boatCategories() {
				return BoatCategories.find();
			},
			manufacturers() {
				return Manufacturers.find();
			},
			adFormFields() {
				return AdFormFields.find();
			}
		});

		this.uploader.filters.push({
			name: 'imageFilter',
			fn(item, options) {
				const type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';

				return '|jpg|png|jpeg|bmp|'.indexOf(type) !== -1;
			}
		});

		this.uploader.onCompleteAll = function() {
			$state.go('admin.ads-manage');
		};

		this.uploader.onProgressAll = function (progress){
			$scope.settings.uploadProgress = progress;
		};

		this.uploader.onSuccessItem = function(item) {
			Listings.update(item._listingId, {$push: {photos: item._filename}});
		};
	}

	save() {
		this.loading = true;

		// TODO
	}

	removePhoto(photo) {
		// TODO
	}
}

class FacebookPostCreate {
	constructor($scope, $reactive) {
		'ngInject';

		$reactive(this).attach($scope);

		this.$scope = $scope;
		this.loading = false;
		this.selectedListings = [];
		this.listings = [];
		this.message = '';
		this.pagination = {
			page: 1,
			total: 0
		};

		$scope.$watch('pagination.page', () => {
			this.search();
		});
	}

	search() {
		const options = {
			limit: 10,
			skip: (this.pagination.page - 1) * 10
		};

		this.call('listings.search-admin', {pendingFBPromotion: true}, options, (err, res) => {
			if(err) {
				return alert(err.reason || err.message);
			}

			this.pagination.total = res.total;
			this.listings = res.listings;
		});
	}

	canAdd(_id) {
		return !_.contains(this.selectedListings.map(l => l._id), _id);
	}

	ok() {
		this.loading = true;
		Meteor.call('facebook-ads.create', this.message, this.selectedListings.map(l => l._id), err => {
			if(!err) {
				return this.$scope.$close();
			}

			console.log(err);
			alert(err.message);
		});
	}
}

class FacebookPosts {
	constructor($scope, $reactive, $uibModal) {
		'ngInject';

		$reactive(this).attach($scope);

		this.$uibModal = $uibModal;
		this.pagination = {
			page: 1,
			total: 0
		};
		this.ads = [];

		$scope.$watch('pagination.page', () => {
			this.search();
		});
	}

	search() {
		const options = {
			limit: 10,
			skip: (this.pagination.page - 1) * 10,
			sort: {creationDate: -1}
		};

		this.call('facebook-ads.search', {}, options, (err, res) => {
			if(err) {
				return alert(err.reason || err.message);
			}

			this.pagination.total = res.total;
			this.ads = res.ads;
		});
	}

	create() {
		this.$uibModal.open({
			template: facebookCreateAdTemplate,
			controller: FacebookPostCreate,
			controllerAs: 'fbc'
		});
	}

	remove(ad) {
		if(!confirm('Are you sure you want to remove this ad?')) {
			return;
		}

		FacebookAds.remove(ad._id, err => {
			if(err) {
				return alert('Error, try again later');
			}

			alert('Ad removed');
		});
	}
}

const name = 'admin';

export default name;

angular.module(name, [angularMeteor, uiRouter, angularMeteorAuth])
.config($stateProvider => {
	'ngInject';

	$stateProvider.state('admin', {
		abstract: true,
		url: '/admin',
		template,
		controllerAs: 'a',
		controller: Admin
	})
	.state('admin.index', {
		url: '',
		template: indexTemplate,
		controllerAs: 'ai',
		controller: AdminIndex
	})
	.state('admin.social-networks', {
		url: '/social-networks',
		template: socialNetworksTemplate,
		controllerAs: 'sn',
		controller: SocialNetworksCtrl
	})
	.state('admin.users-manage', {
		url: '/users-manage',
		template: usersManageTemplate,
		controllerAs: 'um',
		controller: UsersManage
	})
	.state('admin.ads-manage', {
		url: '/ads-manage',
		template: adsManageTemplate,
		controllerAs: 'am',
		controller: AdsManage
	})
	.state('admin.ad-form-settings', {
		url: '/ad-form-settings',
		template: adFormSettingsTemplate,
		controllerAs: 'fs',
		controller: FormSettings
	})
	.state('admin.payment-settings', {
		url: '/payment-settings',
		template: paymentSettingsTemplate,
		controllerAs: 'ps',
		controller: PaymentSettings
	})
	.state('admin.facebook-ads', {
		url: '/facebook-ads',
		template: facebookAdsTemplate,
		controllerAs: 'fb',
		controller: FacebookPosts
	})
	.state('admin.edit-listing', {
		url: '/:_id',
		template: editListingTemplate,
		controllerAs: 'el',
		controller: EditListing,
		resolve: {
			listing($stateParams, $q) {
				'ngInject';

				const deferred = $q.defer();

				Meteor.call('listings.get', $stateParams._id, (err, res) => {
					if(err) {
						deferred.reject(err.reason);
					} else {
						deferred.resolve(res);
					}
				});

				return deferred.promise;
			}
		}
	})
});
