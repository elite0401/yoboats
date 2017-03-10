import {Meteor} from 'meteor/meteor';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';
import {Email} from 'meteor/email';
import {check} from 'meteor/check';

import {getUserEmail} from './user-utils'

if(Meteor.isServer) {
	Meteor.methods({
		'contactSeller': function (contactForm){
			var contactFormSchema = new SimpleSchema({
				userId: {
					type: String
				},
				name: {
					type: String
				},
				email: {
					type: String
				},
				phone: {
					type: String,
					optional: true
				},
				message: {
					type: String
				}
			});

			check(contactForm, contactFormSchema);

			var owner = Meteor.users.findOne({_id: contactForm.userId}),
				text = 'Name: ' + contactForm.name + '\r\nEmail: ' + contactForm.email;

			if(!owner) {
				throw new Meteor.Error(400, 'This owner is not registered');
			}

			if(contactForm.phone) {
				text += '\r\nPhone: ' + contactForm.phone + '\r\n';
			}

			text += contactForm.message;

			if(!getUserEmail(owner)) {
				throw new Meteor.Error(400, 'We are sorry this owner has no email registered');
			}

			this.unblock();

			Email.send({
				from: Meteor.settings.mail.from,
				to: getUserEmail(owner),
				replyTo: contactForm.email,
				subject: "Yoboats inquirie.",
				text
			});
		},
		'captchaVerify': function(response){
			Meteor.http.call( 'POST', 'https://www.google.com/recaptcha/api/siteverify', {
				params: {
					secret: Meteor.settings.google.recaptchaSecretKey,
					response: response
				},
			}, function(error, response) {
				if(error) {
					return false;
				}

				return response.data.success;
			});
		}
	});
}
