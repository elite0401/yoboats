import angular from 'angular';
import angularMeteor from 'angular-meteor';
import angularMeteorAuth from 'angular-meteor-auth';
import uiRouter from 'angular-ui-router';

import MyListing from './listing';

import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {Roles} from 'meteor/alanning:roles';

import template from './template.html';
import profileTemplate from './profile.html';
import billingTemplate from './billing.html';
import addCardTemplate from './add-card.html';
import removeCardTemplate from './remove-card.html';

import {Plans} from '../../../api/plans';

class My {
	constructor($scope, $reactive, $auth, $state) {
		'ngInject';

		this.$state = $state;

		$reactive(this).attach($scope);

		$auth.awaitUser().then(user => {}, () => {
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

class Profile {
	constructor(Notification) {
		'ngInject';

		this.not = Notification;
		this.passwordChange = false;
		this.password = {};
		this.originalName = Meteor.user().profile.name;
		this.newName = Meteor.user().profile.name;
	}

	save() {
		if(this.passwordChange && this.password.newPass==this.password.newPassConfirm) {
			if(this.password.oldPass==this.password.newPass) return;

			Accounts.changePassword(this.password.oldPass, this.password.newPass, err => {
				if(err) {
					this.not.error({message: err.reason});
					return;
				}

				alert('Password successfully changed');
				this.password = {};
				this.passwordChange = false;
			});
		}

		if(this.originalName==this.newName) return;

		Meteor.call('user.changeName', this.newName, err => {
			if(err) {
				this.not.error({message: 'Error while saving, try again later'});
				return;
			}

			this.not.success({message: 'Profile name updated'});
			this.originalName = this.newName;
		})
	}
}

class Billing {
	constructor($scope, $reactive, $uibModal) {
		'ngInject';

		$reactive(this).attach($scope);

		this.subscribe('plans');

		this.$uibModal = $uibModal;
		this.loading = false;
		this.customer = {};

		this.helpers({
			plans() {
				return Plans.find();
			}
		});

		this.loadCustomer();
	}

	loadCustomer() {
		this.loading = true;

		this.call('user.customer-data', (err, cust) => {
			this.loading = false;

			if(err) {
				return alert(err.reason || err.message);
			}

			this.customer = cust;
		});
	}

	addCard() {
		const self = this;

		self.$uibModal.open({
			template: addCardTemplate,
			controller($scope) {
				'ngInject';

				$scope.checkout = (status, res) => {
					if(res.error) {
						alert(res.error.message);
					} else {
						$scope.$close(res);
					}
				};
			}
		}).result.then(res => {
			Meteor.call('user.addCard', res, err => {
				if(err) {
					return alert('Error while saving card, try again later');
				}

				self.loadCustomer();
				alert('Card linked to your account');
			})
		});
	}

	removeCard(card) {
		this.$uibModal.open({
			template: removeCardTemplate
		}).result.then(err => {
			this.loading = true;

			this.call('user.removeCard', card.id, err => {
				if(err) {
					return alert(err.reason || err.message);
				}

				this.loadCustomer();
				alert('Card removed from your account');
			});
		});
	}

	makeDefault(card) {
		if(!confirm('Are you sure you want to make this card your default payment method?')) {
			return;
		}

		this.loading = true;

		Meteor.call('user.setDefaultCard', card.id, err => {
			this.loadCustomer();

			if(err) {
				return alert('Error while changing card');
			}

			alert('Default payment method changed');
		});
	}

	unsubscribe() {
		if(!confirm('Are you sure you want to unsubscribe from this plan?')) {
			return;
		}

		if(this.customer.subscriptions.data.length===0) {
			return;
		}

		this.loading = true;

		Meteor.call('user.removeSubscription', err => {
			this.loadCustomer();

			if(err) {
				return alert(err.reason || err.message);
			}

			alert('Subscription removed');
		});
	}

	selectPlan(plan) {
		if(!confirm('Are you sure you want to subscribe to this plan?')) {
			return;
		}

		this.lading = true;
		if(this.customer.subscriptions.data.length>0) {
			Meteor.call('user.updateSubscription', $scope.customer.subscriptions.data[0].id, plan._id, err => {
				if(err) {
					return alert(err.reason || err.message);
				}

				this.loadCustomer();
				alert('Subscription updated');
			});
		} else {
			Meteor.call('user.subscribeToPlan', plan._id, err => {
				if(err) {
					return alert(err.reason || err.message);
				}

				this.loadCustomer();
				alert('Subscribed');
			});
		}
	}

	confirmPublish(listing) {
		// TODO
	}
}

const name = 'my';

export default name;

angular.module(name, [angularMeteor, uiRouter, angularMeteorAuth, MyListing])
.config($stateProvider => {
	'ngInject';

	$stateProvider.state('my', {
		abstract: true,
		url: '/my',
		template,
		controllerAs: 'my',
		controller: My
	})
	.state('my.profile', {
		url: '/profile',
		template: profileTemplate,
		controller: Profile,
		controllerAs: 'p'
	})
	.state('my.billing', {
		url: '/billing',
		template: billingTemplate,
		controller: Billing,
		controllerAs: 'b'
	});
});
