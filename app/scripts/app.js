/* global angular, io, location */

/**
 * App Config — FsMail Edition
 * Author: FatahShaheen OS (Paradox Studio)
 */

const app = angular.module('mailDevApp', ['ngRoute', 'ngResource', 'ngSanitize', 'ngCookies'])

app.config(['$routeProvider', function ($routeProvider) {
  $routeProvider
    .when('/', { templateUrl: 'views/main.html', controller: 'MainCtrl' })
    .when('/email/:itemId', { templateUrl: 'views/item.html', controller: 'ItemCtrl' })
    .otherwise({ redirectTo: '/' })
}])

app.run(['$rootScope', function ($rootScope) {
  // Connect Socket.io Network Stream
  const socket = io({
    path: location.pathname + 'socket.io'
  })

  socket.on('newMail', function (data) {
    // Dynamic Inward Trigger Handshake
    $rootScope.$emit('newMail', data)
  })

  socket.on('deleteMail', function (data) {
    // Structural Storage Cleanup Handshake
    $rootScope.$emit('deleteMail', data)
  })

  $rootScope.$on('Refresh', function () {
    console.log('[FsMail Core] Storage layer sync refresh triggered.')
  })
}])

/**
 * Filter to encode special HTML characters safely
 */
app.filter('escapeHTML', function () {
  return function (text) {
    if (text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&#39;')
        .replace(/"/g, '&quot;')
    }
    return ''
  }
})

/**
 * Filter to encode URI parameters
 */
app.filter('encodeURIComponent', function ($window) {
  return $window.encodeURIComponent
})
