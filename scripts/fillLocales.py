#!/usr/bin/env python3
# encoding=utf8
import argparse
import os
from glob import glob, escape
import ruamel.yaml
import csv

yaml = ruamel.yaml.YAML()
yaml.indent(sequence=4, offset=4, mapping=4)
yaml.width=80

class ValueReplacer():

    startBoldHtml = "<strong>"
    endBoldHtml = "</strong>"
    boldNotation = "**"

    startOblique = "<span class=\"_pale _oblique\">"
    endOblique = "</span>"
    obliqueNotation = "__"

    startGreen = "<span style=\"color: green;\">"
    endGreen = "</span>"
    greenNotation = "_green_"

    startRed = "<span style=\"color: red;\">"
    endRed = "</span>"
    redNotation = "_red_"

    @staticmethod
    def replaceStartEnd(string, notation, startReplaced, endReplaced):
        replacedStr = string
        # If even number of the notation, replace by proper start/end tags
        if notation in replacedStr and replacedStr.count(notation) % 2 == 0:
            replacedCount = 0
            while notation in replacedStr:
                replaceWith = startReplaced if replacedCount % 2 == 0 else endReplaced
                replacedStr = replacedStr.replace(notation, replaceWith, 1)
                replacedCount += 1
        return replacedStr
    
    @staticmethod
    def replace(string):
        # \n  by br tags
        replacedStr = string.replace("\n", "<br />")
        # replaced each bold, oblique, green and red notations by proper tags
        replacedStr = ValueReplacer.replaceStartEnd(replacedStr, ValueReplacer.boldNotation, ValueReplacer.startBoldHtml, ValueReplacer.endBoldHtml)
        replacedStr = ValueReplacer.replaceStartEnd(replacedStr, ValueReplacer.obliqueNotation, ValueReplacer.startOblique, ValueReplacer.endOblique)
        replacedStr = ValueReplacer.replaceStartEnd(replacedStr, ValueReplacer.greenNotation, ValueReplacer.startGreen, ValueReplacer.endGreen)
        replacedStr = ValueReplacer.replaceStartEnd(replacedStr, ValueReplacer.redNotation, ValueReplacer.startRed, ValueReplacer.endRed)
        return replacedStr


class TranslationLangNs():
    def __init__(self, inputFile):
        self.modified = False
        self.data = {}
        self.file = inputFile
        self.startBoldHtml = "<strong>"
        self.endBoldHtml = "</strong>"
    
    def stringToYaml(self, str):
        if "\n" in str:
            return ruamel.yaml.scalarstring.FoldedScalarString(str)
        if len(str) > 76:
            return ruamel.yaml.scalarstring.FoldedScalarString(str)
        return str
    
    def loadCurrentTranslations(self):
        with open(self.file, "r") as stream:
            try:
                translationData = yaml.load(stream)
                self.data = {}
                for key in translationData:
                    self.data[key] = self.stringToYaml(translationData[key])
            except Exception as err:
                print(f"Error loading yaml file {err}")
                raise Exception("Error loading translation yaml file " + self.file)
    
    def save(self):
        if self.modified:
            
            with open(self.file, 'w') as file:
                yaml.dump(self.data, file)
            print(f"Saved translation file {self.file}")

    
    def addTranslation(self, key, value, overwrite, keepMarkdown):
        if not overwrite and key in self.data:
            return

        value = value.replace("[nom]", "\{\{nickname\}\}")
    
        # Replace with html
        if not keepMarkdown:
            value = ValueReplacer.replace(value)
        
        self.data[key] = self.stringToYaml(value)
        self.modified = True

class TranslationData():
    def __init__(self, localesPath):
        # Dictionary key is the language, value is an dictionary, where key is the namespace and value is TranslationLangNs
        self.translations = {}
        self.localesPath = localesPath

    def addTranslations(self, lang, namespace, translations):
        if not lang in self.translations:
            self.translations[lang] = {}
        self.translations[lang][namespace] = translations
    
    def save(self):
        for lang in self.translations:
            for namespace in self.translations[lang]:
                self.translations[lang][namespace].save()

    def addTranslation(self, lang, namespace, key, value, overwrite, keepMarkdown):
        try:
            if not lang in self.translations:
                self.translations[lang] = {}
            if not namespace in self.translations[lang]:
                self.translations[lang][namespace] = TranslationLangNs(os.path.join(self.localesPath, lang, namespace + '.yml'))
            self.translations[lang][namespace].addTranslation(key, value, overwrite, keepMarkdown)
        except Exception as e:
            print(f"Exception occurred for {lang} {namespace} {key}: {e}")
            raise e


class FillLocalesTranslations():
    def __init__(self, inputFile, localesPath, overwrite, namespace):
        self.inputFile = inputFile
        self.localesPath = localesPath
        self.overwrite = overwrite
        self.namespace = namespace
        self.allTranslations = TranslationData(localesPath)
        super().__init__()

    def loadCurrentTranslations(self):

        # Download the file from qnap
        print(f"Will load translation data from: {self.localesPath}...")
        ymlFiles = glob(escape(self.localesPath) + "/**/*.yml")
        for translationFile in ymlFiles:
            path = os.path.normpath(os.path.dirname(translationFile))
            paths = path.split(os.sep)
            lang = paths[len(paths) - 1]
            namespace = os.path.splitext(os.path.basename(translationFile))[0]
            print(f"getting translations: {lang} {namespace} in {translationFile}...")
            translationNs = TranslationLangNs(translationFile)
            translationNs.loadCurrentTranslations()
            self.allTranslations.addTranslations(lang, namespace, translationNs)
    
    def saveAllTranslations(self):
        self.allTranslations.save()
    
    def addTranslationsFromCsv(self):
        with open(self.inputFile, newline='') as csvfile:

            rows = csv.DictReader(csvfile)
            for row in rows:
                if row['namespace'] and row['key']:
                    if not self.namespace is None and self.namespace != row['namespace']:
                        continue
                    keepMarkdown = row['md']
                    if keepMarkdown == '1':
                        keepMarkdown = True
                    else:
                        keepMarkdown = False
                    for key in row:
                        # Skip known columns
                        if key == 'namespace' or key == 'key' or key == 'md':
                            continue
                        # Do not process empty string
                        if row[key] == '':
                            continue
                        lngContext = key.split('_', 1)
                        # If language part does not have 2 characters, the column should not be processed
                        if len(lngContext[0]) > 2:
                            continue
                        translationKey = row['key']
                        if len(lngContext) > 1:
                            translationKey += '_' + lngContext[1]
                        self.allTranslations.addTranslation(lngContext[0], row['namespace'], translationKey, row[key], self.overwrite, keepMarkdown)


def main():
    parser=argparse.ArgumentParser(
        prog='fillLocales',
        formatter_class=argparse.RawTextHelpFormatter,
        description="Generate the translations files from a csv file. The csv file should have the following headings\n"
         " namespace: Namespace in which to save this string\n"
         " key: Base key to use for this translation\n"
         " md: Set to 1 to keep this translated string as markdown\n"
         " ...rest: Heading is in the format <lang>_<additional contexts>\n"
         "\n"
         " The following line will add a translation string to the fr/home.yml file named MyQuestion_context\n"
         "   namespace,key,md,fr_context\n"
         "   home,MyQuestion,,Text"
    )

    parser.add_argument("--inputFile", required=True, help="The csv file containing the translations strings")
    parser.add_argument("--overwrite", action=argparse.BooleanOptionalAction, default=False, help="Whether to overwrite the text if it already exists")
    parser.add_argument("--localesPath", required=True, help="The directory containing the locales file. Each language will be included in a sub-directory of this dir")
    parser.add_argument("--namespace", required=False, default=None, help="If set, only the strings for this namespace will be imported. Others will be ignored.")

    args=parser.parse_args()

    task = FillLocalesTranslations(args.inputFile, args.localesPath, args.overwrite, args.namespace)
    
    # TODO Put in try/catch when all is ok
    task.loadCurrentTranslations()
    task.addTranslationsFromCsv()
    task.saveAllTranslations()
    
    

if __name__ == "__main__":
    main()