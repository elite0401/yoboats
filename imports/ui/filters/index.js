import angular from 'angular';

import capitalize from './capitalize';
import adPhoto from './ad-photo';

const name = 'filters';

export default name;

angular.module(name, [capitalize, adPhoto]);
