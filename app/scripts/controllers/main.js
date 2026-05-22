/* global app, angular */

/**
 * Main Workspace Controller — Manage visible incoming arrays cleanly
 * Author: FatahShaheen OS (Paradox Studio)
 */
let refreshTimeout = null
let notificationTimeout = null

app.controller('MainCtrl', [
  '$scope', '$rootScope', '$http', 'Email', '$route', '$location', 'Favicon',
  function ($scope, $rootScope, $http, Email, $route, $location, Favicon) {
    $scope.notificationsSupported = 'Notification' in window && window.isSecureContext

    $scope.itemsLoading = true
    $scope.items = []
    $scope.currentItemId = null
    $scope.unreadItems = 0
    $scope.navMoreOpen = false
    $scope.deleteAllSafeguard = true

    const settingsKey = 'fsmailSettings'

    const saveSettings = function () {
      if (window.localStorage) {
        window.localStorage.setItem(settingsKey, JSON.stringify($scope.settings))
      }
    }

    const loadSettings = function (defaultSettings) {
      try {
        const settingsJSON = window.localStorage.getItem(settingsKey)
        return Object.assign({}, defaultSettings, JSON.parse(settingsJSON))
      } catch (err) {
        return defaultSettings
      }
    }

    const defaultSettings = {
      notificationsEnabled: false,
      autoShowEnabled: false,
      darkThemeEnabled: false
    }
    $scope.settings = loadSettings(defaultSettings)

    const countUnread = function () {
      $scope.unreadItems = $scope.items.filter(function (email) {
        return !email.read
      }).length
      Favicon.setUnreadCount($scope.unreadItems)
    }

    const loadData = function () {
      $scope.itemsLoading = true
      $scope.items = Email.query(function () {
        $scope.itemsLoading = false
      })
      $scope.items.$promise.then(function () {
        countUnread()
      })
    }

    $rootScope.$on('Refresh', function (e, d) {
      loadData()
    })

    $rootScope.$on('$routeChangeSuccess', function (e, route) {
      if (route.params) {
        $scope.currentItemId = route.params.itemId
      }
    })

    $rootScope.$on('newMail', function (e, newEmail) {
      $scope.items.push(newEmail)
      countUnread()

      if (!refreshTimeout) {
        refreshTimeout = setTimeout(function () {
          refreshTimeout = null
          if ($scope.settings.autoShowEnabled) {
            $location.path('/email/' + newEmail.id)
          }
          $scope.$apply()
        }, 200)
      }

      // 🎯 Fixed: Real-time window notification badge pointers now map to icon.png cleanly
      if (!notificationTimeout && $scope.settings.notificationsEnabled) {
        notificationTimeout = setTimeout(function () {
          notificationTimeout = null
        }, 2000)
        
        new window.Notification('FsMail Workspace', { body: newEmail.subject, icon: 'icon.png' })
          .addEventListener('click', function () {
            $location.path('/email/' + newEmail.id)
            $scope.$apply()
          })
      }
    })

    $rootScope.$on('deleteMail', function (e, email) {
      if (email.id === 'all') {
        $rootScope.$emit('Refresh')
        $location.path('/')
      } else {
        const idx = $scope.items.reduce(function (p, c, i) {
          if (p !== 0) return p
          return c.id === email.id ? i : 0
        }, 0)

        const nextIdx = $scope.items.length === 1 ? null : idx === 0 ? idx + 1 : idx - 1
        if (nextIdx !== null) {
          $location.path('/email/' + $scope.items[nextIdx].id)
        } else {
          $location.path('/')
        }

        $scope.items.splice(idx, 1)
        countUnread()
        $scope.$apply()
      }
    })

    $scope.markCurrentAsRead = function () {
      if (!$scope.currentItemId || !$scope.items || !$scope.items.length) return

      const filtered = $scope.items.filter(function (e) {
        return e.id === $scope.currentItemId
      })

      if (!filtered || !filtered.length) return
      filtered[0].read = true
      countUnread()
    }

    $scope.$watch('currentItemId', function (val, oldVal) {
      $scope.markCurrentAsRead()
    }, false)

    $scope.$watch('items', function (val, oldVal) {
      $scope.markCurrentAsRead()
    }, true)

    $scope.markReadAll = function () {
      $http({
        method: 'PATCH',
        url: 'email/read-all'
      })
      .success(function (data, status) {
        for (const email of $scope.items) {
          email.read = true
        }
        countUnread()
      })
      .error(function (data) {
        window.alert('Unable to process request: ' + data.error)
      })
    }

    $scope.headerNavStopPropagation = function ($event) {
      $event.stopPropagation()
    }

    $scope.toggleNavMore = function ($event) {
      $event.stopPropagation()
      $scope.navMoreOpen = !$scope.navMoreOpen
    }

    function hideNavMore (e) {
      $scope.$apply(function () {
        $scope.navMoreOpen = false
      })
    }

    function addHideNavMoreHandler (element) {
      angular.element(element)
        .off('click', hideNavMore)
        .on('click', hideNavMore)
    }

    addHideNavMoreHandler(window)

    $scope.toggleAutoShow = function () {
      $scope.settings.autoShowEnabled = !$scope.settings.autoShowEnabled
      saveSettings()
    }

    $scope.refreshList = function () {
      $rootScope.$emit('Refresh')
    }

    $scope.deleteAll = function () {
      let t
      if ($scope.deleteAllSafeguard) {
        $scope.deleteAllSafeguard = false
        t = setTimeout(function () {
          $scope.deleteAllSafeguard = true
          $scope.$apply()
        }, 2000)
        return
      }
      clearTimeout(t)
      $scope.deleteAllSafeguard = true
      Email.delete({ id: 'all' })
    }

    $scope.toggleDarkTheme = function () {
      $scope.settings.darkThemeEnabled = !$scope.settings.darkThemeEnabled
      saveSettings()
    }

    $scope.toggleNotifications = function () {
      if ($scope.notificationsSupported && $scope.settings.notificationsEnabled) {
        $scope.settings.notificationsEnabled = false
        saveSettings()
        return
      }

      window.Notification.requestPermission()
        .then(function (permissions) {
          $scope.settings.notificationsEnabled = permissions === 'granted'
          saveSettings()
        })
        .catch(function () {
          window.alert('Notification permission request was denied by the browser.')
        })
    }

    loadData()

    $http({ method: 'GET', url: 'config' })
      .success(function (data) {
        $rootScope.config = data
        $scope.config = data
      })
  }
])
