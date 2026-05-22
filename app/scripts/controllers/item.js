/* global angular, app, prompt */

/**
 * Email Item Controller — FsMail Control Board
 * Author: FatahShaheen OS (Paradox Studio)
 */

app.controller('ItemCtrl', [
  '$scope',
  '$rootScope',
  '$routeParams',
  '$location',
  'Email',
  '$http',
  '$cookies',
  function (
    $scope,
    $rootScope,
    $routeParams,
    $location,
    Email,
    $http,
    $cookies
  ) {
    // Fetch individual message structure safely
    const getItem = function () {
      Email.get(
        { id: $routeParams.itemId },
        function (email) {
          $scope.item = new Email(email)

          if ($scope.item.html) {
            $scope.item.iframeUrl = 'email/' + $scope.item.id + '/html'
            prepIframe()
            $scope.panelVisibility = 'html'
          } else {
            $scope.htmlView = 'disabled'
            $scope.panelVisibility = 'plain'
          }
        },
        function () {
          console.error('[FsMail Error] Requested message record not found.')
          $location.path('/')
        }
      )
    }

    // Get message source code
    const getSource = function () {
      if (typeof $scope.rawEmail === 'undefined') {
        $scope.rawEmail = 'email/' + $scope.item.id + '/source'
      }
    }

    // Prepares the text container window interaction
    const prepIframe = function () {
      setTimeout(function () {
        const [iframe] = document.getElementsByTagName('iframe')
        if (!iframe) return
        
        const [head] = iframe.contentDocument.getElementsByTagName('head')
        const baseEl = iframe.contentDocument.createElement('base')

        // Force all outward links inside message bodies to open safely in new tabs
        baseEl.setAttribute('target', '_blank')
        if (head) head.appendChild(baseEl)

        replaceMediaQueries(iframe)
        fixIframeHeight(iframe)

        addHideDropdownHandler(
          iframe.contentDocument.getElementsByTagName('body')[0]
        )
      }, 500)
    }

    // Dynamic horizontal height compensation to clear inner scrollbars
    const fixIframeHeight = function (iframe) {
      if (!iframe) return
      const body = iframe.contentDocument.getElementsByTagName('body')[0]
      if (body) {
        iframe.height = body.scrollHeight
      }
    }

    // Formats layout queries to scale cleanly on mobile view screens
    const replaceMediaQueries = function (iframe) {
      angular.forEach(
        iframe.contentDocument.styleSheets,
        function (styleSheet) {
          try {
            angular.forEach(styleSheet.cssRules, function (rule) {
              if (rule.media && rule.media.mediaText) {
                rule.media.mediaText = rule.media.mediaText.replace(
                  'device-width',
                  'width'
                )
              }
            })
          } catch (e) {
            // Catches cross-domain iframe style policy security checks cleanly
          }
        }
      )
    }

    $scope.toggleDropdown = function ($event, dropdownName) {
      $event.stopPropagation()
      $scope.dropdownOpen = dropdownName === $scope.dropdownOpen ? '' : dropdownName
    }

    function hideDropdown (e) {
      $scope.$apply(function () {
        $scope.dropdownOpen = ''
      })
    }

    function addHideDropdownHandler (element) {
      angular
        .element(element)
        .off('click', hideDropdown)
        .on('click', hideDropdown)
    }

    addHideDropdownHandler(window)

    function validateEmail (email) {
      const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      return re.test(email)
    }

    $scope.show = function (type) {
      if ((type === 'html' || type === 'attachments') && !$scope.item[type]) {
        return
      }
      if (type === 'source') getSource()
      $scope.panelVisibility = type
    }

    $scope.delete = function (item) {
      Email.delete({ id: item.id })
    }

    $scope.resize = function (newSize) {
      const [iframe] = document.getElementsByTagName('iframe')
      if (iframe) {
        iframe.style.width = newSize || '100%'
        fixIframeHeight(iframe)
      }
      $scope.iframeSize = newSize
    }

    // Forward message payload rule
    $scope.relayTo = function (item) {
      const lastRelayTo = $cookies.relayTo
      const relayTo = prompt('Enter the destination email address to forward this message:', lastRelayTo)

      if (relayTo) {
        if (validateEmail(relayTo)) {
          $scope.relay(item, relayTo)
          $cookies.relayTo = relayTo
        } else {
          window.alert('The specified email address format is not valid.')
        }
      }
    }

    $scope.relay = function (item, relayTo) {
      if (!$rootScope.config.isOutgoingEnabled) {
        window.alert('The outgoing forward relay service is not configured on this server.')
        return
      }

      const confirmText = 'Are you sure you want to send this message directly to ' + 
        (relayTo || item.to.map(function (to) { return to.address }).join()) + '?'

      if (window.confirm(confirmText)) {
        $http({
          method: 'POST',
          url: 'email/' + item.id + '/relay' + (relayTo ? '/' + relayTo : '')
        })
        .success(function (data, status) {
          window.alert('Message forwarded successfully.')
        })
        .error(function (data) {
          window.alert('Forwarding failed: ' + data.error)
        })
      }
    }

    getItem()
  }
])
