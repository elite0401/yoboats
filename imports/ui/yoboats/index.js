import _ from 'underscore';
import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';
import 'angular-recaptcha';
import 'angular-ui-bootstrap';

import {Meteor} from 'meteor/meteor';

import Filters from '../filters';
import Directives from '../directives';
import Login from './login';
import Admin from './admin';
import Listing from './listing';
import My from './my';

import {SocialNetworks} from '../../api/social-networks';

import template from './landing/template.html';
import indexTemplate from './landing/index.html';
import buyersTemplate from './landing/how-it-works-buyers.html';
import sellersTemplate from './landing/how-it-works-sellers.html';
import contactTemplate from './landing/contact.html';
import privacyTemplate from './landing/privacy.html';

class Landing {
	constructor($scope, $reactive, $state, $uibModal) {
		'ngInject';

		this.$state = $state;
		this.$uibModal = $uibModal;

		$reactive(this).attach($scope);

		this.subscribe('social-networks');

		this.helpers({
			socialNetworks() {
				return SocialNetworks.find();
			}
		});
	}

	logout() {
		Meteor.logout(() => {
			this.$state.go('landing.landing');
		});
	}
}

class LandingLanding {
	constructor($scope, $reactive) {
		'ngInject';

		$reactive(this).attach($scope);

		this.sortOptions = [
			{l: 'Price - Lowest first', v: {price: 1}},
			{l: 'Price - Highest first', v: {price: -1}},
			{l: 'Name - A-Z', v: {name: 1}},
			{l: 'Name - Z-A', v: {name: -1}},
			{l: 'Manufacture year - Newest first', v: {manufactureYear: -1}},
			{l: 'Manufacture year - Oldest first', v: {manufactureYear: 1}},
			{l: 'Publishing date - Newest first', v: {creationDate: -1}},
			{l: 'Publishing date - Oldest first', v: {creationDate: 1}}
		];

		this.searchParams = {
			filter: '',
			minPrice: null,
			maxPrice: null,
			category: 'All',
			sort: this.sortOptions[0],
			pleasure: {
				page: 1,
				total: 0
			},
			commercial: {
				page: 1,
				total: 0
			}
		};

		this.listings = {
			commercial: [],
			pleasure: []
		}

		$scope.$watchGroup(['searchParams.category', 'searchParams.pleasure.page', 'searchParams.commercial.page', 'searchParams.sort'], () => {
			this.search();
		});
	}

	search() {
		const query = {$and: []};

		if(this.searchParams.filter!='') {
			const q = {$regex: this.searchParams.filter, $options: "i"};

			query.$or = [
				{name: q},
				{manufacturer: q},
				{year: q},
				{city: q}
			];
		}

		if(this.searchParams.minPrice && this.searchParams.minPrice!==null) {
			query.$and.push({price: {$gte: this.searchParams.minPrice}});
		}

		if(this.searchParams.maxPrice && this.searchParams.maxPrice!==null) {
			query.$and.push({price: {$lte: this.searchParams.maxPrice}});
		}

		if(query.$and.length===0) {
			delete query.$and;
		}

		const options = {
			limit: 8,
			sort: this.searchParams.sort.v
		};

		if(this.searchParams.boatCategory && this.searchParams.boatCategory!='All') {
			query.boatCategory = this.searchParams.boatCategory;

			this.doSearch(this.searchParams.boatCategory.toLowerCase(), query);
		} else {
			query.boatCategory = "Commercial";
			this.doSearch('commercial', query);

			query.boatCategory = "Pleasure";
			this.doSearch('pleasure', query);
		}
	}

	doSearch(type, query) {
		const options = {
			limit: 8,
			sort: this.searchParams.sort.v,
			skip: (this.searchParams[type].page - 1) * 8
		};

		this.call('listings.search', query, options, (err, res) => {
			if(err) {
				alert(err.reason || err.message);
			} else {
				this.listings[type] = res.listings;
				this.searchParams[type].total = res.total;
			}
		});
	}

	addToFavorites(_id) {
		const user = Meteor.user();
		if(!user || !user.profile) {
			return false;
		}

		Meteor.call('user.add-favorite', _id, err => {
			if(err) {
				console.log(err);
			}
		});
	}

	inFavorites(_id) {
		const user = Meteor.user();
		if(!user || !user.profile) {
			return false;
		}

		return _.contains(user.profile.favorites, _id);
	}
}

angular.module('yoboats', [angularMeteor, uiRouter, 'ui.bootstrap', 'vcRecaptcha', Filters, Directives, Login, Admin, Listing, My])
.config(($locationProvider, $urlRouterProvider, $stateProvider, $compileProvider) => {
	'ngInject';

	// From http://www.trajano.net/2016/04/minor-performance-boost-for-angularjs-and-meteor/
	$compileProvider.debugInfoEnabled(!Meteor.isProduction);
	$locationProvider.html5Mode(true);
	$urlRouterProvider.otherwise('/');

	$stateProvider.state('landing', {
		abstract: true,
		url: '',
		template,
		controller: Landing,
		controllerAs: 'l'
	})
	.state('landing.landing', {
		url: '/',
		template: indexTemplate,
		controller: LandingLanding,
		controllerAs: 'll'
	})
	.state('landing.how-it-works-buyers', {
		url: '/how-it-works/buyers',
		template: buyersTemplate
	})
	.state('landing.how-it-works-sellers', {
		url: '/how-it-works/sellers',
		template: sellersTemplate
	})
	.state('landing.contact', {
		url: '/contact',
		template: contactTemplate
	})
	.state('landing.privacy', {
		url: '/privacy',
		template: privacyTemplate
	});

	Stripe.setPublishableKey(Meteor.settings.public.stripePublicKey);
})
.run(($rootScope, $state) => {
	'ngInject';

	$rootScope.$on('$stateChangeError', (e, ts, tp, fs, fp, err) => {
		if(err==='AUTH_REQUIRED') {
			$state.go('login.login');
		}
	});
});
