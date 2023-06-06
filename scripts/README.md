This directory contains some helper scripts to help develop surveys

## fillLocales.py

This script takes translation strings from a `csv` file and creates the proper `yml` locales files with keys mapping to language-specific translations. The `label` and `text` widget configuration can then use translation functions to get the text display.

Run `./fillLocales.py --help` to get details on the arguments to put on the command line.

The `csv` file should contain the following columns, with the first row containing the headings:

* namespace: Namespace in which to save this string
* key: Base key to use for this translation
* md: Set to 1 to keep this translated string as markdown, otherwise, it will be considered as html
* ...rest: Heading is in the format `<lang>_<additional contexts>`

For example, the following `csv` file
```
namespace,key,md,fr_one,fr,en_one,en
home,HowAreYou,,Comment allez-vous?,Comment va {{nickname}}?,How are you?,How is {{nickname}}?
home,Hello,,,Bonjour,,Hello
```

would generate 2 translations files, in the following directory structure

```
<locale path>
  |- en
  |   |- home.yml
  |- fr
  |   |- home.yml
```

The files will have the following content:

```
# fr/home.yml
HowAreYou: Comment va {{nickname}}?
HowAreYou_one: Comme allez-vous?
Hello: Bonjour
```
```
#  en/home.yml
HowAreYou: How is {{nickname}}?
HowAreYou_one: How are you?
Hello: Hello
```

Then, in the survey components, the labels can be translated as follows:

```{typescript}
const howAreYouWidget = {
    ...,
    label: (t: TFunction, interview) => {
        const person = helper.getPerson(interview);
        return t('home:HowAreYou', { nickname: person.nickname, count: <get the number of people in household>})
    }
}
```

### Formatting strings

It is possible to add format to the locales strings.

If the markdown field is set to 1, the string will be considered as markdown and will be copied as such.

If the markdown field is not set, the string will be converted to html. While the string can be entered in full html, this format is harder to read. So commonly-used formats are used instead to wrap the strings to format:

* Text wrapped between `**`: Will be converted in bold text
* Text wrapped between `__`: Will be converted in survey italique style (`_pale _oblique` css styles)
* Text wrapped between `_green_`: Will be colored green
* Text wrapped between `_red__`: Will be colored red