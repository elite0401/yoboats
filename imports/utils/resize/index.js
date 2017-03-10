export default function(fileType, outputQuality) {
	var self = this;

	self.fileType = fileType || 'image/jpeg';
	self.outputQuality = outputQuality || 0.8;

	self.photo = function(file, maxSize, callback) {
		var reader = new FileReader();

		reader.onload = function(e) {
			self.resize(e.target.result, maxSize, callback);
		};

		reader.readAsDataURL(file);
	};

	self.resize = function(dataUrl, maxSize, callback) {
		var image = new Image();

		image.onload = function(e) {
			var canvas = document.createElement('canvas'),
				width = image.width,
				height = image.height;

			if(width > height) {
				if(width > maxSize) {
					height *= maxSize / width;
					width = maxSize;
				}
			} else {
				if(height > maxSize) {
					width *= maxSize / height;
					height = maxSize;
				}
			}

			canvas.width = width;
			canvas.height = height;
			canvas.getContext('2d').drawImage(image, 0, 0, width, height);

			canvas.toBlob(callback, self.fileType, self.outputQuality);
		};

		image.src = dataUrl;
	};
};
