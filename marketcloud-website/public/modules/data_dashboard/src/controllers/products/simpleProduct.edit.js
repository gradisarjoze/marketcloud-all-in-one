(function() {
  'use strict'

  angular.module('DataDashboard')
    .controller('EditSimpleProductController', EditSimpleProductController)

  EditSimpleProductController.$inject = [
  '$scope',
  '$marketcloud',
  'product',
  '$http',
  '$utils',
  '$validation']

  function EditSimpleProductController(scope, $marketcloud, product, $http, $utils,$validation) {
    // Injecting resolve data into the controller
    scope.product = product.data.data

    // This will hold custom properties for further processing
    scope.customPropertiesData = {}

    // Should we be able to edit the slug? this is a on/off
    scope.unsafeSlug = false

    scope.selectedCategories = []

    if (scope.product.categories && scope.product.categories.length) {
      var cats = scope.product.categories.split(',')
      var promises = []
      cats.forEach(function (categoryId) {
        promises.push($marketcloud.categories.list({
          id: categoryId
        }))
      })

      Promise.all(promises)
        .then(function (response) {
          response.forEach(function (res) {
            if (res.data.data[0]) {
              var category = {
                category_id: res.data.data[0].id,
                text: res.data.data[0].path
              }
              scope.selectedCategories.push(category)
            }
          })
        })
    }

    // Listening to category selector events
    scope.$on('selectedCategory', function (event, data) {
      var categoryId = data.category_id

      if (scope.selectedCategories.map(cat => cat.category_id).indexOf(categoryId) === -1) {
        scope.selectedCategories.push(data)
      }
    })

    // mapping non-core attributes into scope.customPropertiesData
    var coreProperties = Models.Product.getPropertyNames()

    scope.schema = Models.Product.schema

    coreProperties.push(
      'id',
      'currencies',
      'display_price_discount',
      'display_price',
      'has_variants', // for legacy reasons
      'type',
      'media',
      'tax_id',
      'locales',
      'seo',
      'requires_shipping',
      'product_id',
      'variant_id',
      'application_id'
    )

    for (var k in scope.product) {
      if (coreProperties.indexOf(k) < 0) {
        scope.customPropertiesData[k] = scope.product[k]
        delete scope.product[k]
      }
    }

    scope.updateSlug = function() {
      scope.product.slug = $utils.getSlugFromString(scope.product.name)
    }

    scope.swapArrayItemPosition = function moveItem(fromIndex, toIndex, target) {
      var toMove = JSON.parse(JSON.stringify(target[fromIndex]))

      // We ensure that the indexes exist
      if (fromIndex > target.length - 1) {
        return
      }

      // First we remove the element to move
      target.splice(fromIndex, 1)

      // Then we add it to the desired position
      target.splice(toIndex, 0, toMove)
    }

    // This method must be implemented in order to
    // make the media manager work
    scope.getImagesContainer = function() {
      return scope.product.images
    }

    scope.removeImage = function(i) {
      scope.product.images.splice(i, 1)
    }

    scope.setMainCategoryToLast = function () {

      if (scope.selectedCategories.length > 0) {
        scope.product.category_id = scope.selectedCategories[scope.selectedCategories.length - 1].category_id
      } else {
        scope.product.category_id = null
      }
    }

    scope.newAttribute = {
      name: null,
      value: null,
      type: null
    }
    scope.newAttribute.type = 'string'
    scope.availableTypes = [{
      name: 'String',
      value: 'string'
    }, {
      name: 'Number',
      value: 'number'
    }, {
      name: 'Boolean',
      value: 'boolean'
    }]

    scope.filterNotNullProperties = function(item) {
      var result = {}
      for (var k in item) {
        if (item[k]) {
          result[k] = item[k]
        }
      }
      return result
    }

    scope.updateProduct = function() {
      // let's re-assemble the product first.
      for (var k in scope.customPropertiesData) {
        scope.product[k] = scope.customPropertiesData[k]
      }

      switch (scope.product.stock_type) {
        case 'status':
          delete scope.product.stock_level
          break

        case 'track':
          delete scope.product.stock_status
          break
      }

      var categories = ''
      scope.selectedCategories.forEach(function (category, idx) {
        categories += category.category_id

        if (idx < scope.selectedCategories.length - 1) {
          categories += ','
        }
      })

      scope.product.categories = categories

      $marketcloud.products.update(scope.product.id, scope.product)
        .then(function(response) {
          notie.alert(1, 'Update Succeded', 1.5)
        })
        .catch(function(error) {
          console.log("erore",error)
          if (400 === error.status){

            notie.alert(2, 'Please check the data you entered', 1.5)

            var validation = error.data.errors[0];
            var invalidPropertyName = "product."+validation.invalidPropertyName;

            var element = angular.element('[ng-model="'+invalidPropertyName+'"]').parent()

            $validation.showErrorMessage(validation,'[ng-model="'+invalidPropertyName+'"]')




          } else
            notie.alert(3, 'Update failed', 1.5)
        })
    }
  }
})()