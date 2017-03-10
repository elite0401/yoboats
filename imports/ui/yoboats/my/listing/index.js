import angular from 'angular';
import angularMeteor from 'angular-meteor';
import uiRouter from 'angular-ui-router';

import {Meteor} from 'meteor/meteor';

import indexTemplate from './index.html';
import missingPlanTemplate from './missing-plan.html';
import listingEditorTemplate from './editor.html';
import termsAndConditionsTemplate from './terms-and-conditions.html';
import confirmPublishTemplate from './confirm-publish.html';
import removePublishTemplate from './remove-publish.html';
import doPublishTemplate from './do-publish.html';
import confirmPromotionTemplate from './confirm-promotion.html';

import Resize from '../../../../utils/resize';

import {BoatCategories} from '../../../../api/boat-categories';
import {Manufacturers} from '../../../../api/manufacturers';
import {AdFormFields} from '../../../../api/ad-form-fields';
import {Listings} from '../../../../api/listings';
import {Plans} from '../../../../api/plans';

class MyListings {
	constructor($scope, $reactive) {
		'ngInject';

		$reactive(this).attach($scope);

		this.subscribe('user');
	}
}

class MyListingIndex {
	constructor($scope, $reactive, $uibModal) {
		'ngInject';

		$reactive(this).attach($scope);

		this.$uibModal = $uibModal;
		this.loading = false;
		this.myListings = [];

		this.call('listings.search_old', {userId: Meteor.userId()}, (err, res) => {
			if(err) {
				console.log(err);
			}

			this.myListings = res;
		});

		this.subscribe('plans');
		this.subscribe('listings', () => {
			return [this.getReactively('myListings')];
		});

		this.helpers({
			listings() {
				return Listings.find();
			},
			plans() {
				return Plans.find();
			}
		});
	}

	publish(ad) {
		const plan = Plans.findOne(this.currentUser.profile.plan);

		if(!plan) {
			this.$uibModal.open({
				template: missingPlanTemplate
			});

			return;
		}

		this.$uibModal.open({
			template: ad.published? removePublishTemplate : doPublishTemplate
		}).result.then(() => {
			Meteor.call('listings.publish', ad._id, err => {
				if(!err) {
					if(!ad.published) {
						alert('Ad publication removed');
					} else {
						alert('Ad published');
					}
				} else {
					if(err.error!=403) {
						return alert(err.reason);
					}

					this.$uibModal.open({
						template: subscriptionProblemTemplate,
						controller: $scope => {
							'ngInject';

							$scope.message = error.reason;
							$scope.ad = ad;
						}
					});
				}
			});
		});
	}

	hasActiveFb(ad) {
		return ad.pendingFBPromotion || (!!ad.fbPromotionExpires && (ad.fbPromotionExpires.getTime()>(new Date()).getTime()));
	}

	promote(ad) {
		this.$uibModal.open({
			template: confirmPromotionTemplate
		}).result.then(() => {
			this.loading = true;

			this.call('listings.promote', ad._id, err => {
				this.loading = false;

				if(err) {
					return alert(err.message);;
				}

				alert('Thanks for your purchase. Your ad will be promoted soon.');
			});
		});
	}

	remove(ad) {
		if(!confirm('Are you sure you want to remove this ad?')) {
			return;
		}

		this.loading = true;

		this.call('listings.remove', ad._id, err => {
			this.loading = false;

			if(err) {
				return alert(err.message);;
			}

			alert('Ad successfully removed');
		});
	}
}

class CreateListing {
	constructor($scope, $reactive, $state, $uibModal, $q, $window, FileUploader) {
		'ngInject';

		$reactive(this).attach($scope);

		this.$state = $state;
		this.$uibModal = $uibModal;
		this.$q = $q;
		this.$window = $window;
		this.loading = false;
		this.listing = {};
		this.calOpened = {};
		this.uploadProgress = 0;
		this.upload2Progress = 0;
		this.uploader = new FileUploader({});
		this.uploader2 = new FileUploader({
			url: 'https://api.cloudinary.com/v1_1/' + Meteor.settings.public.cloudinary.cloudName + '/upload',
			formData: [{upload_preset: Meteor.settings.public.cloudinary.uploadPreset}]
		});
		this.manufacturers = [];

		this.call('manufacturers.list', (err, res) => {
			if(err) {
				return alert(err.message);
			}

			this.manufacturers = res;
		});

		this.subscribe('boat-categories');
		this.subscribe('ad-form-fields');

		this.helpers({
			boatCategories() {
				return BoatCategories.find();
			},
			adFormFields() {
				return AdFormFields.find();
			}
		});

		this.uploader.filters.push({
			name: 'imageFilter',
			fn(item, options) {
				const type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';

				return '|jpg|png|jpeg|bmp|'.indexOf(type) !== -1;
			}
		});

		this.uploader.onSuccessItem = item => {
			Listings.update(item._listingId, {$push: {photos: item._filename}});
		};

		this.uploader.onCompleteAll = () => {
			if(this.uploader2.queue.length>0 && this.upload2Progress<100) {
				return;
			}

			this.confirmPublish(this.listing);
			this.$state.go('my.listing.index');
		};

		this.uploader.onProgressAll = progress => {
			this.uploadProgress = progress;
		};

		this.uploader2.filters.push({
			name: 'videoFilter',
			fn(item, options) {
				const type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';

				return '|mp4|avi|'.indexOf(type) !== -1;
			}
		});

		this.uploader2.onSuccessItem = (item, response) => {
			Listings.update(item._listingId, {$set: {video: response}});
		};

		this.uploader2.onCompleteAll = () => {
			if(this.uploader.queue.length>0 && this.uploadProgress<100) {
				return;
			}

			this.confirmPublish(this.listing);
			this.$state.go('my.listing.index');
		};

		this.uploader2.onProgressAll = progress => {
			this.upload2Progress = progress;
		};
	}

	back() {
		this.$window.history.back();
	}

	confirmPublish(listing) {
		this.$uibModal.open({
			template: confirmPublishTemplate,
			controller: $scope => {
				'ngInject';

				$scope.listing = listing;
			}
		}).result.then(() => {
			const plan = Plans.findOne({_id: Meteor.user().profile.plan});
			if(!plan) {
				return this.$uibModal.open({
					template: missingPlanTemplate
				});
			}

			Meteor.call('listings.publish', listing._id, err => {
				if(!err) {
					return alert('Ad published');
				}

				alert(err.reason);
			});
		});
	}

	save() {
		this.loading = true;
		const self = this;

		Listings.insert(this.listing, (err, _id) => {
			if(err) {
				return alert(err.reason || err.message);
			}

			self.listing._id = _id;

			if(self.uploader.queue.length===0) {
				self.confirmPublish(self.listing);
				return self.$state.go('my.listing.index');
			}

			const promises = [];

			self.uploader.queue.forEach(item => {
				const ext = item.file.name.substr(item.file.name.lastIndexOf('.') + 1),
					  deferred = self.$q.defer();

				Meteor.call('listing.sign-upload-policy', _id, ext, (err, signature) => {
					if(err) {
						console.log(err);
						throw new Meteor.Error(err);
					}

					item.url = signature.url;
					item.formData = signature.formData;
					item.formData.push({'Content-Type': item.file.type});
					item._filename = signature.filename;
					item._listingId = _id;

					const resizer = new Resize(item.file.type);

					resizer.photo(item._file, 800, blob => {
						item._file = blob;

						deferred.resolve(null);
					});
				});

				promises.push(deferred.promise);
			});

			if(self.uploader2.queue.length>0) {
				self.uploader2.queue[0]._listingId = _id;
				self.uploader2.queue[0].upload();
			}

			self.$q.all(promises).then(() => {
				const items = self.uploader.queue.filter(item => {
					return !item.isUploaded;
				}).filter(item => {
					return !item.isUploading;
				});

				if(!items.length) return;

				items.forEach(item => {
					item._prepareToUploading();
				});

				items[0].upload();
			});
		});
	}

	termsAndConditions() {
		this.$uibModal.open({
			template: termsAndConditionsTemplate
		});
	}
}

class EditListing {
	constructor($scope, $reactive, $state, $uibModal, $q, $window, FileUploader, listing) {
		'ngInject';

		$reactive(this).attach($scope);

		this.$state = $state;
		this.$uibModal = $uibModal;
		this.$q = $q;
		this.$window = $window;
		this.loading = false;
		this.listing = listing;
		this.calOpened = {};
		this.uploadProgress = 0;
		this.upload2Progress = 0;
		this.uploader = new FileUploader({});
		this.uploader2 = new FileUploader({
			url: 'https://api.cloudinary.com/v1_1/' + Meteor.settings.public.cloudinary.cloudName + '/upload',
			formData: {
				upload_preset: Meteor.settings.public.cloudinary.uploadPreset,

			}
		});

		this.subscribe('boat-categories');
		this.subscribe('manufacturers');
		this.subscribe('ad-form-fields');

		this.helpers({
			boatCategories() {
				return BoatCategories.find();
			},
			manufacturers() {
				return Manufacturers.find();
			},
			adFormFields() {
				return AdFormFields.find();
			}
		});

		this.uploader.filters.push({
			name: 'imageFilter',
			fn(item, options) {
				const type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';

				return '|jpg|png|jpeg|bmp|'.indexOf(type) !== -1;
			}
		});

		this.uploader.onSuccessItem = item => {
			Listings.update(item._listingId, {$push: {photos: item._filename}});
		};

		this.uploader.onCompleteAll = () => {
			if(this.uploader2.queue.length>0 && this.upload2Progress<100) {
				return;
			}

			this.confirmPublish(this.listing);
			this.$state.go('my.listing.index');
		};

		this.uploader.onProgressAll = progress => {
			this.uploadProgress = progress;
		};

		this.uploader2.filters.push({
			name: 'videoFilter',
			fn(item, options) {
				const type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';

				return '|mp4|avi|'.indexOf(type) !== -1;
			}
		});

		this.uploader2.onSuccessItem = item => {
			Listings.update(item._listingId, {$set: {video: item._filename}});
		};

		this.uploader2.onCompleteAll = () => {
			if(this.uploader.queue.length>0 && this.uploadProgress<100) {
				return;
			}

			this.confirmPublish(this.listing);
			this.$state.go('my.listing.index');
		};

		this.uploader2.onProgressAll = progress => {
			this.upload2Progress = progress;
		};
	}

	back() {
		this.$window.history.back();
	}

	confirmPublish(listing) {
		this.$uibModal.open({
			template: confirmPublishTemplate,
			controller: $scope => {
				'ngInject';

				$scope.listing = listing;
			}
		}).result.then(() => {
			const plan = Plans.findOne({_id: Meteor.user().profile.plan});
			if(!plan) {
				return this.$uibModal.open({
					template: missingPlanTemplate
				});
			}

			Meteor.call('listings.publish', listing._id, err => {
				if(!err) {
					return alert('Ad published');
				}

				alert(err.reason);
			});
		});
	}

	save() {
		this.loading = true;
		const self = this,
			  data = angular.copy(this.listing);

		delete data._id;

		Listings.update(this.listing._id, {$set: data}, (err, _id) => {
			if(err) {
				return alert(err.reason || err.message);
			}

			self.listing._id = _id;

			if(self.uploader.queue.length===0) {
				self.confirmPublish(self.listing);
				return self.$state.go('my.listing.index');
			}

			const promises = [];

			self.uploader.queue.forEach(item => {
				const ext = item.file.name.substr(item.file.name.lastIndexOf('.') + 1),
					  deferred = self.$q.defer();

				Meteor.call('listing.sign-upload-policy', _id, ext, (err, signature) => {
					if(err) {
						console.log(err);
						throw new Meteor.Error(err);
					}

					item.url = signature.url;
					item.formData = signature.formData;
					item.formData.push({'Content-Type': item.file.type});
					item._filename = signature.filename;
					item._listingId = _id;

					const resizer = new Resize(item.file.type);

					resizer.photo(item._file, 800, blob => {
						item._file = blob;

						deferred.resolve(null);
					});
				});

				promises.push(deferred.promise);
			});

			self.$q.all(promises).then(() => {
				const items = self.uploader.queue.filter(item => {
					return !item.isUploaded;
				}).filter(item => {
					return !item.isUploading;
				});

				if(!items.length) return;

				items.forEach(item => {
					item._prepareToUploading();
				});

				items[0].upload();
			});

			if(self.uploader2.queue.length>0) {
				console.log('upload video');
				self.uploader2.queue[0].upload();
			}
		});
	}

	termsAndConditions() {
		this.$uibModal.open({
			template: termsAndConditionsTemplate
		});
	}
}

const name = 'my.listing';

export default name;

angular.module(name, [angularMeteor, uiRouter])
.config($stateProvider => {
	'ngInject';

	$stateProvider.state('my.listing', {
		abstract: true,
		url: '/listing',
		template: '<div ui-view=""></div>',
		controller: MyListings
	})
	.state('my.listing.index', {
		url: '',
		template: indexTemplate,
		controllerAs: 'ml',
		controller: MyListingIndex
	})
	.state('my.listing.create', {
		url: '/create',
		template: listingEditorTemplate,
		controllerAs: 'ml',
		controller: CreateListing
	})
	.state('my.listing.edit', {
		url: '/:_id',
		template: listingEditorTemplate,
		controllerAs: 'ml',
		controller: EditListing,
		resolve: {
			listing($stateParams, $q) {
				'ngInject';

				const deferred = $q.defer();

				Meteor.call('listings.get', $stateParams._id, (err, res) => {
					if(err) {
						return deferred.reject(err.message);
					}

					deferred.resolve(res);
				});

				return deferred.promise;
			}
		}
	})
	;
});
