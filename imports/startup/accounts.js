import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';

Accounts.config({
	forbidClientAccountCreation: true
});

Accounts.onCreateUser((options, user) => {
	if(user.services.facebook) {
		var result = Meteor.http.get('https://graph.facebook.com/me', {
			params: {
				access_token: user.services.facebook.accessToken,
				fields: 'id,name,email,picture.type(large)' //data to ask for
			}
		});

		if(result.error) {
			throw result.error;
		}

		user.profile = result.data;
	}

	return user;
});

Accounts.emailTemplates.from = 'YoBoats.com';
Accounts.emailTemplates.siteName = 'YoBoats.com';

Accounts.emailTemplates.verifyEmail.text = function(user, url) {
	var greeting = (user.profile && user.profile.name)? ("Hello " + user.profile.name + ",") : "Hello,";

	url = url.replace('#', 'login');

	return greeting + '\r\n\r\nTo verify your account email, simply click the link below.\r\n\r\n' + url + '\r\n\r\nThanks.';
};

Accounts.emailTemplates.resetPassword.text = function(user, url) {
	var greeting = (user.profile && user.profile.name)? ("Hello " + user.profile.name + ",") : "Hello,";

	url = url.replace('#', 'login');

	return greeting + '\r\n\r\nTo reset your password, simply click the link below.\r\n\r\n' + url + '\r\n\r\nThanks.';
};

Accounts.validateLoginAttempt((attempt) => {
	if(attempt.user) {
		if(attempt.user.emails && !attempt.user.emails[0].verified) {
			throw new Meteor.Error(403, 'Email not verified');
		}
	}

	return true;
});
