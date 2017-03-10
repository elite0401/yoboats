import angular from 'angular';
import angularMeteor from 'angular-meteor';
import angularMeteorAuth from 'angular-meteor-auth';
import uiRouter from 'angular-ui-router';

import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {Roles} from 'meteor/alanning:roles';

import template from './template.html';
import loginTemplate from './login.html';
import registerTemplate from './register.html';
import recoverPasswordTemplate from './recover-password.html';
import resetPasswordTemplate from './reset-password.html';
import verifyEmailTemplate from './verify-email.html';

class Login {
	constructor($scope, $reactive, $state, $auth, Notification) {
		'ngInject';

		$reactive(this).attach($scope);

		this.loading = false;
		this.$state = $state;
		this.Notification = Notification;

		$auth.awaitUser().then((user) => {
			this.redirect(user);
		});
	}

	redirect(user) {
		if(Roles.userIsInRole(user, 'admin')) {
			return this.$state.go('admin.index');
		}

		if(Roles.userIsInRole(user, 'user')) {
			return this.$state.go('my.listing.index');
		}

		Meteor.logout(() => {
			this.$state.go('login.login', {}, {reload: true});
		});
	}
}

class LoginLogin extends Login {
	loginCallback(err) {
		if(err) {
			alert(err.reason || err.message || err);
		} else {
			super.redirect(Meteor.user());
		}
	}

	login() {
		Meteor.loginWithPassword(this.username, this.password, err => {
			// Explicit call, otherwise it overrides "this"
			this.loginCallback(err);
		});
	}

	facebookLogin() {
		Meteor.loginWithFacebook({requestPermissions: ['email', 'user_friends', 'public_profile']}, err => {
			// Explicit call, otherwise it overrides "this"
			this.loginCallback(err);
		});
	}
}

class LoginRegister extends Login {
	register() {
		Meteor.call('user.register', this.user, err => {
			if(err) {
				return alert(err.reason);
			}

			alert('A verification link has been sent to your email address. Please use it to confirm your registration.');

			this.$state.go('landing.landing');
		})
	}

	facebookLogin() {
		Meteor.loginWithFacebook({requestPermissions: ['email', 'user_friends', 'public_profile']}, err => {
			// Explicit call, otherwise it overrides "this"
			this.loginCallback(err);
		});
	}
}

class LoginRecoverPassword extends Login {
	recover() {
		Accounts.forgotPassword({email: this.email}, err => {
			if(err) {
				alert('Error sending forgot password email');
			} else {
				this.Notification.success({message: 'Password recovery email sent', delay: 2000});
				this.email = '';
			}
		});
	}
}

class LoginPasswordReset extends Login {
	reset() {
		this.loading = true;

		Accounts.resetPassword(this.$state.params.token, this.password, err => {
			this.loading = false;

			if(err) {
				alert(err.reason || err.message);
			} else {
				this.$state.go('login.login', {}, {reload: true});
			}
		});
	}
}

class LoginVerifyEmail extends Login {
	constructor($scope, $reactive, $state, $auth, Notification) {
		'ngInject';

		super($scope, $reactive, $state, $auth, Notification);

		Accounts.verifyEmail($state.params.token, err => {
			if(err) {
				this.error = err.reason;
			} else {
				$state.go('login.login', {}, {reload: true});
			}
		})
	}
}

const name = 'login';

export default name;

angular.module(name, [angularMeteor, uiRouter, angularMeteorAuth])
.config($stateProvider => {
	'ngInject';

	$stateProvider.state('login', {
		abstract: true,
		url: '/login',
		template
	})
	.state('login.login', {
		url: '',
		template: loginTemplate,
		controllerAs: 'l',
		controller: LoginLogin
	})
	.state('login.register', {
		url: '/register',
		template: registerTemplate,
		controllerAs: 'lr',
		controller: LoginRegister
	})
	.state('login.recover-password', {
		url: '/recover-password',
		template: recoverPasswordTemplate,
		controllerAs: 'lr',
		controller: LoginRecoverPassword
	})
	.state('login.verify-email', {
		url: '/verify-email/:token'
		// TODO
	})
	.state('login.enroll-account', {
		url: '/enroll-account/:token',
		template: resetPasswordTemplate,
		controllerAs: 'lr',
		controller: LoginPasswordReset
	})
	.state('login.reset-password', {
		url: '/reset-password/:token',
		template: resetPasswordTemplate,
		controllerAs: 'lr',
		controller: LoginPasswordReset
	});
});
