import fs = require('fs');
import Papa = require('papaparse');
import { SurveyWidgetConfig } from "../../../../../example/demo_survey/src/config/widgets.config";

export async function readCSVFile(filePath: string) : Promise<SurveyWidgetConfig[]> {
    const widgetProperties: SurveyWidgetConfig[] = [];
    const csvFile = fs.readFileSync(filePath);
    const csvData = csvFile.toString();
    await Papa.parse(csvData, {
        header: true,
        complete: (result) => {
            result.data.forEach((data) => {
                widgetProperties.push(data as SurveyWidgetConfig);
            });
        },
        error: (error) => {
            console.log(error);
        }
    });
    return widgetProperties;
}