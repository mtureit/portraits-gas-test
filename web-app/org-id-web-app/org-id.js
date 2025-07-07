/*
    Copyright 2022 Taro TSUKAGOSHI

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/**
 * 大学ポートレートWeb-API用の大学・組織ID一覧を返すためのweb app。
 * @see https://api-portal.portraits.niad.ac.jp/api-info.html
 *
 * 上記URLにある「Web-API仕様」＞「詳細仕様」の「別紙 (組織ID一覧等)」の
 * Excelの内容を、このスクリプトがバインドされているスプレッドシートに転記してある。
 * このweb appに対してGETリクエストを送信すると、スプレッドシートの内容がJSON形式で
 * 返される。
 * 本体APIに組織ID等を参照するエンドポイントが定義されれば不要となる。
 */

const SHEET_NAME_UNIV_IDS = '大学ID一覧';
const SHEET_NAME_INTL_ID_SUFFIXES = '外国人用組織ID一覧';
const SHEET_NAME_ORGANIZATION_IDS = '学部・研究科等組織ID一覧';
const CACHE_KEYS = {
  univIds: 'univIds',
  intlIdSuffixes: 'intlIdSuffixes',
  organizationIds: 'organizationIds',
};
const CACHE_EXPIRATION_IN_SECONDS = 21600; // The maximum time the value remains in the cache, in second. For details, see https://developers.google.com/apps-script/reference/cache/cache?hl=en#putkey,-value,-expirationinseconds
const WEB_APP_KEY =
  PropertiesService.getScriptProperties().getProperty('webAppKey');

/**
 * Return JSON-formatted content upon GET request
 * @param {Object} event Event parameter that contain information about request parameters.
 * See official documentation for details: https://developers.google.com/apps-script/guides/web?hl=en#request_parameters
 * @returns {String} JSON content in string
 */
function doGet(event) {
  let returnJson = {};
  try {
    if (event.parameter.key === WEB_APP_KEY) {
      const documentCache = CacheService.getDocumentCache();
      if (event.parameter.mode) {
        const cachedIds = documentCache.get(event.parameter.mode);
        returnJson[event.parameter.mode] = cachedIds
          ? JSON.parse(cachedIds)
          : createJsonCache([event.parameter.mode])[event.parameter.mode];
      } else {
        const cacheKeys = Object.values(CACHE_KEYS);
        const cachedResponses = documentCache.getAll(cacheKeys);
        Object.keys(cachedResponses).forEach((key) => {
          if (key === 'univIds' || key === 'intlIdSuffixes') {
            returnJson[key] = JSON.parse(cachedResponses[key]);
          }
        });
        returnJson['organizationIds'] = createJsonCache([
          'organizationIds',
        ]).organizationIds;
        if (!Object.keys(returnJson).includes('univIds')) {
          returnJson['univIds'] = createJsonCache(['univIds']).univIds;
        }
        if (!Object.keys(returnJson).includes('intlIdSuffixes')) {
          returnJson['intlIdSuffixes'] = createJsonCache([
            'intlIdSuffixes',
          ]).intlIdSuffixes;
        }
      }
    }
  } catch (error) {
    returnJson['error'] = error.message;
  }
  return ContentService.createTextOutput(
    JSON.stringify(returnJson),
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Update document cache when the spreadsheet is edited
 */
function onEdit() {
  createJsonCache();
}

/**
 * Time-triggered function to update document cache
 */
function triggeredCacheUpdate() {
  createJsonCache();
}

/**
 * Creates cache in JSON string for the web app to return to HTTP requests.
 * @param {Array} mode An array to designate which JSON to renew cache.
 * Defaults to renewing all cache. ただし学部・研究科等組織ID一覧に関してはデータ量が大きく、cacheは利用できない。
 * @returns {Object} The JSON object to have renewed the cache.
 * If mode designates multiple objects, the return will be an object
 * with the mode value as keys and the cached object as values.
 */
function createJsonCache(mode) {
  const modeList = Object.values(CACHE_KEYS);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  mode = Array.isArray(mode) && mode.length > 0 ? mode : modeList;
  let cachedObj = modeList.reduce((obj, modeType) => {
    if (mode.includes(modeType)) {
      if (modeType === 'univIds') {
        const activeSheet = ss.getSheetByName(SHEET_NAME_UNIV_IDS);
        let univIdsPre = activeSheet.getDataRange().getValues();
        const univIdsHeader = univIdsPre.shift();
        const univIds = univIdsPre.map((row) =>
          univIdsHeader.reduce((o, k, i) => {
            o[k] = row[i];
            return o;
          }, {}),
        );
        const univIdsStr = JSON.stringify(univIds);
        console.info(`大学IDのリスト生成完了:\n${univIdsStr}}`); // log
        CacheService.getDocumentCache().put(
          modeType,
          univIdsStr,
          CACHE_EXPIRATION_IN_SECONDS,
        );
        obj['univIds'] = univIds;
      } else if (modeType === 'intlIdSuffixes') {
        const activeSheet = ss.getSheetByName(SHEET_NAME_INTL_ID_SUFFIXES);
        let intlIdSuffixesPre = activeSheet.getDataRange().getValues();
        const intlIdSuffixesHeader = intlIdSuffixesPre.shift();
        const intlIdSuffixes = intlIdSuffixesPre.map((row) =>
          intlIdSuffixesHeader.reduce((o, k, i) => {
            o[k] = row[i];
            return o;
          }, {}),
        );
        const intlIdSuffixesStr = JSON.stringify(intlIdSuffixes);
        console.info(
          `外国人用組織ID suffixのリスト生成完了:\n${intlIdSuffixesStr}}`,
        ); // log
        CacheService.getDocumentCache().put(
          modeType,
          intlIdSuffixesStr,
          CACHE_EXPIRATION_IN_SECONDS,
        );
        obj['intlIdSuffixes'] = intlIdSuffixes;
      } else if (modeType === 'organizationIds') {
        const activeSheet = ss.getSheetByName(SHEET_NAME_ORGANIZATION_IDS);
        let organizationIdsTablePre = activeSheet.getDataRange().getValues();
        const organizationIdsTableHeader = organizationIdsTablePre.shift();
        const organizationIdsTable = organizationIdsTablePre.map((row) =>
          organizationIdsTableHeader.reduce((o, k, i) => {
            o[k] = row[i];
            return o;
          }, {}),
        );
        const organizationIds = organizationIdsTable.reduce(
          (oidObj, tableRow) => {
            if (!oidObj[tableRow['AY']]) {
              oidObj[tableRow['AY']] = {};
            }
            if (!oidObj[tableRow['AY']][tableRow['UNIV']]) {
              oidObj[tableRow['AY']][tableRow['UNIV']] = [];
            }
            oidObj[tableRow['AY']][tableRow['UNIV']].push({
              OID: tableRow['OID'],
              DEP: tableRow['DEP'],
              LOC: tableRow['LOC'],
              CTG: tableRow['CTG'],
              DN: tableRow['DN'],
            });
            return oidObj;
          },
          {},
        );
        const organizationIdsStr = JSON.stringify(organizationIds);
        console.info(
          `学部・研究科等組織IDのリスト生成完了:\n${organizationIdsStr}}`,
        ); // log
        /*CacheService.getDocumentCache().put(
          modeType,
          organizationIdsStr,
          CACHE_EXPIRATION_IN_SECONDS
        );*/
        obj['organizationIds'] = organizationIds;
      }
    }
    return obj;
  }, {});
  return cachedObj;
}

if (typeof module == 'object') {
  module.exports = {
    doGet,
    onEdit,
    triggeredCacheUpdate,
  };
}
