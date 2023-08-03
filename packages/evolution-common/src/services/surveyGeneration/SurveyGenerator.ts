import { SurveyWidgetConfig } from "../../../../../example/demo_survey/src/config/widgets.config";
import { readCSVFile } from './CSVHandle';


export async function WidgetListGenerator (filePath: string): Promise<SurveyWidgetConfig[]> {
    const widgetList : SurveyWidgetConfig[] = [];
    await readCSVFile(filePath)
        .then((data) => {
            data.length !== 0 && data.forEach((widgetProperties) => {
                const widget : SurveyWidgetConfig = { ...widgetProperties as SurveyWidgetConfig };
                widgetList.push(widget);
            });
        })
        .catch((error) => {
            console.log(error);
        });
    return widgetList;
}

WidgetListGenerator('./__tests__/dataExample.csv').then((data) => console.log(data));

