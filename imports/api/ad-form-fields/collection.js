import _ from 'underscore';

import {Mongo} from 'meteor/mongo';
import {Roles} from 'meteor/alanning:roles';
import {SimpleSchema} from 'meteor/aldeed:simple-schema';

import {AdFormSchema} from '../ad-form-schema';

export const AdFormFields = new Mongo.Collection('adformfields');

AdFormFields.allow({
	update(userId, doc) {
		return Roles.userIsInRole(userId, 'admin');
	},
	insert(userId, doc) {
		return Roles.userIsInRole(userId, 'admin');
	},
	remove(userId, doc) {
		return Roles.userIsInRole(userId, 'admin');
	}
});

if (Meteor.isServer) {
	AdFormFields.after.insert(newForm);
	AdFormFields.after.update(newForm);
	AdFormFields.after.remove(newForm);

	function newForm() {
		AdFormSchema.remove({});
		var schema = {
			name: {
				type: "String"
			},
			price: {
				type: "Number",
				min: 1
			},
			boatCategory: {
				type: "String"
			},
			boatType: {
				type: "String"
			},
			manufacturer: {
				type: "String"
			},
			manufactureYear: {
				type: "Number"
			},
			description: {
				type: "String"
			},
			intention: {
				type: "String",
				allowedValues: ["buy", "sell", "auction", "rent"]
			},
			city: {
				type: "String"
			},
			country: {
				type: "String"
			},
			photos: {
				type: "[String]",
				optional: true
			}
		};

		_.each(AdFormFields.find().fetch(), field => {
			if(!field.active) return;

			var schemaField = {};
			switch(field.type) {
				case 'Short text':
				case 'Long text':
					schemaField.type = 'String';
					break;
				case 'Email':
					schemaField.type = 'String';
					schemaField.regEx = SimpleSchema.RegEx.Email;
					break;
				case 'Date':
				case 'Date & time':
				case 'Time':
					schemaField.type = 'Date';
					break;
				case 'Options':
					schemaField.type = '[String]';
					break;
				case 'Yes/No':
					schemaField.type = 'Bolean';
					break;
			}

			schemaField.optional = field.optional;
			schema[field.model] = schemaField;
		});

		AdFormSchema.insert(schema);
	};
}
