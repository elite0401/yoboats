import angular from 'angular';

import angularEnter from './angular-enter';
import angularFileUpload from './angular-file-upload';
import angularSocialShare from './angular-social-share';
import angularToggleSwitch from './angular-toggle-switch';
import angularUiNotification from './angular-ui-notification';
import match from './match';
import ngMeta from './ng-meta';
import stripe from './stripe';

const name = 'directives';

export default name;

angular.module(name, [angularEnter, angularFileUpload, angularSocialShare, angularToggleSwitch, angularUiNotification, match, ngMeta, stripe]);
