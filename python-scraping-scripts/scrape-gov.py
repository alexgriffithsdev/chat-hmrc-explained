import requests
from bs4 import BeautifulSoup
import json


# Get the actual page contents from a page like https://www.gov.uk/tax-sell-property
def getContent(link):
    response = requests.get(link)
    html_content = response.text

    soup = BeautifulSoup(html_content, 'html.parser')
    div_elem = soup.find('div', {'id': 'guide-contents'})

    if not div_elem:
        div_elem = soup.find('div', {'class': 'govuk-govspeak'})

        if not div_elem:
            return ""

    return div_elem.get_text(separator=' ', strip=True).split("Next :")[0]


# For each topic, there tends to be a list of sub topics. This function gets each sub topic link
# For example: https://www.gov.uk/browse/tax/capital-gains
def getLinkedPages(link):
    response = requests.get(link)
    html_content = response.text

    soup = BeautifulSoup(html_content, 'html.parser')
    links = soup.find_all("li", {"class": "browse__list-item"})

    results = {}
    for item in links:
        a = item.find("a", {"class": "govuk-link"})
        newLink = a.get("href")
        newFullLink = "https://www.gov.uk" + newLink

        pageContent = getContent(newFullLink)

        results[newLink] = pageContent

    return results


# This function gets all the topics from the https://www.gov.uk/browse/tax page such as Capital Gains Tax, VAT, etc
# and scrapes all child pages of those topics.
# All content is then stored in a text file list containing the page link and it's content
def getMainTopics(link):
    response = requests.get(link)
    soup = BeautifulSoup(response.text, "html.parser")

    links = soup.find_all("a", {"class": "govuk-link gem-c-cards__link"})

    with open("content.txt", "w") as file:
        for link in links:
            href = link.get("href")
            url = 'https://www.gov.uk' + href

            pageContentMap = getLinkedPages(url)
            print(pageContentMap)

            json.dump({"topic":  href.split('/')[-1], "pages": pageContentMap}, file, indent=4)



getMainTopics("https://www.gov.uk/browse/tax")