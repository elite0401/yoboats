import angular from 'angular';

const name = 'filters.adPhoto';

export default name;

angular.module(name, [])
.filter('adPhoto', () => {
	return (ad, photo) => {
		if(!photo) {
			photo = 0;
		}

		if(!ad.photos || ad.photos.length < 1){
			return '/noPhoto.png';
		}

		return Meteor.settings.public.awsUrl + ad._id + '/' + ad.photos[photo];
	};
});
