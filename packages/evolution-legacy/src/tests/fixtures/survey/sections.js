/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
module.exports = {

  selectPerson: {
    previousSection: 'profiles',
    nextSection: "selectHasMadeTrips",
    title: {
      fr: "Sélection du membre du ménage",
      en: "Household member selection"
    },
    menuName: {
      fr: "Personne",
      en: "Person"
    },
    widgets: [
      'selectPerson',
      'buttonSelectPersonConfirm'
    ]
  },

  selectHasMadeTrips: {
    previousSection: 'selectPerson',
    nextSection: "tripsIntro",
    hiddenInNav: true,
    parentSection: 'visitedPlaces',
    title: {
      fr: "Introduction aux déplacements",
      en: "Trips introduction"
    },
    widgets: []
  },

  tripsIntro: {
    previousSection: 'selectHasMadeTrips',
    nextSection: "visitedPlaces",
    hiddenInNav: true,
    parentSection: 'visitedPlaces',
    title: {
      fr: "Introduction aux déplacements",
      en: "Trips introduction"
    },
    widgets: []
  },

  visitedPlaces: {
    previousSection: 'tripsIntro',
    nextSection: "modes",
    title: {
      fr: "Déplacements",
      en: "Trips"
    },
    menuName: {
      fr: "Déplacements",
      en: "Trips"
    },
    widgets: [
      'personVisitedPlaces',
      'buttonSaveNextSection'
    ],
    groups: {
      'personVisitedPlaces': {
        showGroupedObjectDeleteButton: true,
        showGroupedObjectAddButton:    true,
        addButtonLocation: 'bottom',
        widgets: [
          "visitedPlaceActivity",
          "visitedPlaceName",
          "visitedPlaceGeography",
          "visitedPlaceArrivalTime",
          "visitedPlaceDepartureTime"
        ]
      }
    }
  },

  modes: {
    previousSection: 'visitedPlaces',
    nextSection: "travelBehavior",
    hiddenInNav: true,
    parentSection: 'visitedPlaces',
    title: {
      fr: "Modes de transport",
      en: "Travel modes"
    },
    widgets: []
  },

  travelBehavior: {
    previousSection: 'modes',
    nextSection: "end",
    hiddenInNav: true,
    parentSection: 'visitedPlaces',
    title: {
      fr: "Mobilité",
      en: "Travel behavior"
    },
    widgets: []
  },

  end: {
    previousSection: 'travelBehavior',
    nextSection: "completed",
    title: {
      fr: "Fin",
      en: "End"
    },
    menuName: {
      fr: "Fin",
      en: "End"
    },
    widgets: []
  },

  completed: {
    previousSection: 'end',
    nextSection: null,
    hiddenInNav: true,
    parentSection: 'end',
    title: {
      fr: "Entrevue complétée",
      en: "Interview completed"
    },
    widgets: []
  }

};