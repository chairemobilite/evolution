import { type InputRangeType } from "evolution-common/lib/services/questionnaire/types";

// Note: This was copied from od_nationale_2024.
export const sliderVeryEasyToVeryDifficult: Pick<
  InputRangeType,
  "labels" | "minValue" | "maxValue" | "formatLabel" | "trackClassName"
> = {
  labels: [
    {
      fr: "Très facile",
      en: "Very easy",
    },
    {
      fr: "Modérément difficile",
      en: "Moderately difficult",
    },
    {
      fr: "Très difficile",
      en: "Very difficult",
    },
  ],
  minValue: -10,
  maxValue: 100,
  formatLabel: (value, language) => {
    return value < 0
      ? ""
      : `${value} ${language === "fr" ? "%" : language === "en" ? "%" : ""}`;
  },
  trackClassName: "input-slider-green-yellow-red",
};
