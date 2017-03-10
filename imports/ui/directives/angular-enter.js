import angular from 'angular';

const name = 'directives.angular-enter';

export default name;

angular.module(name, [])
.directive('checkEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.checkEnter);
                });

                event.preventDefault();
            }
        });
    };
});
