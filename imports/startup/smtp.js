import {Meteor} from 'meteor/meteor';

Meteor.startup(function() {
	if(Meteor.settings.mail.smtp) {
		var smtp = Meteor.settings.mail.smtp;

		process.env.MAIL_URL = 'smtp://' + encodeURIComponent(smtp.username) + ':'
								+ encodeURIComponent(smtp.password) + '@'
								+ encodeURIComponent(smtp.server) + ':' + smtp.port;
	}
});
