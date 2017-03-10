import angular from 'angular';
import 'bootstrap/dist/css/bootstrap.css';
import '../imports/ui/bootstrap-social.css';
import '../imports/ui/main.css';
import '../imports/ui/responsive.css';
import 'bootstrap/dist/js/bootstrap.js';

import '../imports/ui/yoboats';

angular.element(document).ready(() => {
	angular.bootstrap(document, ['yoboats'], {strictDi: true});
});
