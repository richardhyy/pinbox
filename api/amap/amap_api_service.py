""" This script is a transportation of the C# version of AmapApiService which is used to
    query the Amap API.

C# Code:

using AmapAPITool.AmapAPI.Entity;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;

namespace AmapAPITool.AmapAPI
{
    public class AmapApiService
    {
        private string _appKey;

        static JsonSerializerSettings _jsonSerializerSettings = new JsonSerializerSettings
        {
            NullValueHandling = NullValueHandling.Ignore,
            MissingMemberHandling = MissingMemberHandling.Ignore
        };

        public AmapApiService(string amapAppKey)
        {
            _appKey = amapAppKey;
        }

        public void SetAppKey(string key)
        {
            _appKey = key;
        }

        public List<POI> SearchPoi(string keywords, string city, int poiPerPage, int page, out int resultCount)
        {
            string responseContent = PreprocessNull(HttpGet(AmapRestfulAPIUrlBuilder.GetQueryPoiUrl(_appKey, keywords, city, poiPerPage, page)));

            POIQueryResponse responseObject = JsonConvert.DeserializeObject<POIQueryResponse>(responseContent);
            if (responseObject == null)
            {
                throw new System.Exception("Failed parsing response");
            }
            if (responseObject.status == "0")
            {
                throw new System.Exception($"Server responded with an error: {responseObject.info}");
            }

            resultCount = Convert.ToInt32(responseObject.count);

            List<POI> pois = new List<POI>();
            responseObject.pois?.ForEach(poi =>
            {
                pois.Add(poi);
            });

            return pois;
        }

        public List<POI> SearchAroundPoi(string location, int radius, string type, int poiPerPage, int page, out int resultCount)
        {
            string responseContent = PreprocessNull(HttpGet(AmapRestfulAPIUrlBuilder.GetQueryAroundUrl(_appKey, location, radius, type, poiPerPage, page)));
            POIQueryResponse responseObject = JsonConvert.DeserializeObject<POIQueryResponse>(responseContent, _jsonSerializerSettings);
            if (responseObject == null)
            {
                throw new System.Exception("Failed parsing response");
            }
            if (responseObject.status == "0")
            {
                throw new System.Exception($"Server responded with an error: {responseObject.info}");
            }

            resultCount = Convert.ToInt32(responseObject.count);

            List<POI> pois = new List<POI>();
            responseObject.pois?.ForEach(poi =>
            {
                pois.Add(poi);
            });

            return pois;
        }

        private string HttpGet(string url)
        {
            HttpWebRequest request = (HttpWebRequest)HttpWebRequest.Create(url);
            request.Method = "GET";
            request.Accept = "*/*";
            request.Timeout = 15000;
            request.AllowAutoRedirect = false;
            WebResponse response = null;
            string responseStr = null;
            response = request.GetResponse();
            if (response != null)
            {
                StreamReader reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8);
                responseStr = reader.ReadLine();
            }
            return responseStr;
        }

        private string PreprocessNull(string json)
        {
            return json.Replace("[]", "null");
        }
    }

    public static class AmapRestfulAPIUrlBuilder
    {
        public static string BaseUrl = "https://restapi.amap.com/v3/";

        public static string GetQueryPoiUrl(string key, string keywords, string city, int offset, int page,
            string extensions = "all", string output = "json")
        {
            string url = BaseUrl + "place/text?" +
                         $"keywords={keywords}&" +
                         $"city={city}&" +
                         $"offset={offset}&" +
                         $"page={page}&" +
                         $"extensions={extensions}&" +
                         $"output={output}&" +
                         $"key={key}";
            return url;
        }

        public static string GetQueryAroundUrl(string key, string location, int radius, string type, int offset, int page,
            string extensions = "all", string output = "json")
        {
            string url = BaseUrl + "place/around?" +
                         $"location={location}&" +
                         $"radius={radius}&" +
                         $"type={type}&" +
                         $"offset={offset}&" +
                         $"page={page}&" +
                         $"extensions={extensions}&" +
                         $"output={output}&" +
                         $"key={key}";
            return url;
        }
    }
}
"""

import json
import requests


class AmapRestfulAPIUrlBuilder:
    BaseUrl = "https://restapi.amap.com/v3/"

    @staticmethod
    def get_query_poi_url(key, keywords, city, offset, page, extensions = "all", output = "json"):
        url = AmapRestfulAPIUrlBuilder.BaseUrl + "place/text?" + \
            "keywords={keywords}&" + \
            "city={city}&" + \
            "offset={offset}&" + \
            "page={page}&" + \
            "extensions={extensions}&" + \
            "output={output}&" + \
            "key={key}"
        return url.format(keywords=keywords, city=city, offset=offset, page=page, extensions=extensions, output=output, key=key)

    @staticmethod
    def get_query_aroundUrl(key, location, radius, type, offset, page, extensions = "all", output = "json"):
        url = AmapRestfulAPIUrlBuilder.BaseUrl + "place/around?" + \
            "location={location}&" + \
            "radius={radius}&" + \
            "type={type}&" + \
            "offset={offset}&" + \
            "page={page}&" + \
            "extensions={extensions}&" + \
            "output={output}&" + \
            "key={key}"
        return url.format(location=location, radius=radius, type=type, offset=offset, page=page, extensions=extensions, output=output, key=key)


class AmapApiService:
    def __init__(self, amap_app_key):
        self.amap_app_key = amap_app_key

    def search_poi(self, keywords, city, poi_per_page, page):
        url = AmapRestfulAPIUrlBuilder.get_query_poi_url(self.amap_app_key, keywords, city, poi_per_page, page)
        response = requests.get(url)

        if response.status_code != 200:
            raise AmapApiError("AmapApiError: " + response.text)

        response_json = json.loads(response.text)
        pois = []
        for poi in response_json["pois"]:
            pois.append(poi)
        return pois


class AmapApiError(Exception):
    """
    Custom exception for amap api
    """
    def __init__(self, message):
        super().__init__(message)


# Test
if __name__ == '__main__':
    key = input("Input app key for Amap: ")
    amap_api_service = AmapApiService(key)
    pois = amap_api_service.search_poi("咖啡", "南京", 20, 1)
    # Print beatuified json
    print(json.dumps(pois, indent=4, ensure_ascii=False))
