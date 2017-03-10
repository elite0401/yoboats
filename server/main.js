import '../imports/startup';
import '../imports/api/ad-form-fields';
import '../imports/api/ad-form-schema';
import '../imports/api/boat-categories';
import '../imports/api/facebook-ads';
import '../imports/api/helpers';
import '../imports/api/listings';
import '../imports/api/listings/methods';
import '../imports/api/manufacturers';
import '../imports/api/plans';
import '../imports/api/social-networks';
import '../imports/api/users';

import './publications';
import './webhandlers';

import {Meteor} from 'meteor/meteor';
import cloudinary from 'cloudinary';

cloudinary.config({
	cloud_name: Meteor.settings.cloudinary.cloudName,
	api_key: Meteor.settings.cloudinary.apiKey,
	api_secret: Meteor.settings.cloudinary.apiSecret
})
