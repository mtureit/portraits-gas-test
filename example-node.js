// Node.js環境でPortraits-GASライブラリを使用する例
import { PortraitsAPI, OrganizationIDs } from './node-portraits.js';

async function main() {
  try {
    // あなたのアクセスキーを設定
    const ACCESS_KEY = 'jpcup-ak-TUspURlphE96';

    console.log('=== Node.js環境でのPortraits API使用例 ===\n');

    // 1. 組織IDデータの取得（ローカルファイルから）
    console.log('1. 大学ID一覧の取得:');
    const allUnivIds = OrganizationIDs.getAllUnivIds();
    if (allUnivIds) {
      console.log(`  全大学数: ${allUnivIds.length}`);
      console.log('  最初の3大学:');
      allUnivIds.slice(0, 3).forEach((univ) => {
        console.log(`    ID: ${univ.UNIV_ID}, 名前: ${univ.UNIV_NAME}`);
      });
    } else {
      console.log(
        '  ※ 大学IDデータ(UnivList.csv)の読み込みに失敗した可能性があります。',
      );
    }

    // 2. 特定大学のIDを検索
    if (allUnivIds) {
      console.log('\n2. 特定大学のIDを検索:');
      try {
        const targetUnivs = ['東京大学', '京都大学'];
        const specificUnivs = OrganizationIDs.getUnivIds(targetUnivs);
        specificUnivs.forEach((univ) => {
          console.log(`  ${univ.UNIV_NAME}: ${univ.UNIV_ID}`);
        });
      } catch (error) {
        console.log(`  エラー: ${error.message}`);
      }
    }

    // 2.5. 学部・研究科等組織IDのテスト
    console.log('\n2.5. 学部・研究科等組織IDのテスト:');
    try {
      console.log('  2024年度 北海道大学の学部・研究科ID一覧を取得中...');
      const hokkaidoDepts = OrganizationIDs.getOrganizationIdsbyUniv(2024, [
        '北海道大学',
      ]);
      if (hokkaidoDepts && hokkaidoDepts['北海道大学']) {
        console.log(
          `    北海道大学の学部・研究科数: ${hokkaidoDepts['北海道大学'].length}`,
        );
        if (hokkaidoDepts['北海道大学'].length > 0) {
          console.log('    最初の3学部・研究科:');
          hokkaidoDepts['北海道大学'].slice(0, 3).forEach((dept) => {
            console.log(`      ID: ${dept.ID}, 名称: ${dept.DEP}`);
          });
        }
      } else {
        console.log('    北海道大学の学部・研究科情報が見つかりません。');
      }

      console.log('\n  2024年度 京都大学 文学部のIDを検索中...');
      const kyotoLitDepts = OrganizationIDs.searchDepartmentIds(
        2024,
        '京都大学',
        '文学部',
      );
      if (kyotoLitDepts && kyotoLitDepts.length > 0) {
        console.log('    京都大学 文学部関連の組織ID:');
        kyotoLitDepts.forEach((dept) => {
          console.log(`      ID: ${dept.ID}, 名称: ${dept.DEP}`);
        });
      } else {
        console.log('    京都大学 文学部関連の組織IDが見つかりません。');
      }
    } catch (error) {
      console.log(`  学部・研究科IDテストエラー: ${error.message}`);
    }

    // 3. APIを使用したデータ取得（アクセスキーが設定されている場合）
    if (ACCESS_KEY !== 'YOUR_ACCESS_KEY_HERE' && ACCESS_KEY !== '') {
      console.log('\n3. API呼び出し例:');

      // 実際の大学IDを使用（例：東京大学のID）
      const univId = '0172'; // 東京大学のID（例）

      try {
        console.log(`  大学ID ${univId} の2024年度学生教員等状況票を取得中...`);
        const studentFacultyStatus = await PortraitsAPI.getStudentFacultyStatus(
          ACCESS_KEY,
          2024,
          univId,
        );

        console.log('  取得成功!');
        console.log(
          `  ステータス: ${studentFacultyStatus.GET_STATUS_LIST.RESULT.STATUS}`,
        );
        console.log(
          `  メッセージ: ${studentFacultyStatus.GET_STATUS_LIST.RESULT.ERROR_MSG}`,
        );

        if (studentFacultyStatus.GET_STATUS_LIST.RESULT.STATUS === '0') {
          console.log('  データが正常に取得されました');
          // データの一部を表示
          const dataCount =
            studentFacultyStatus.GET_STATUS_LIST.DATALIST_INF.NUMBER;
          console.log(`  データ件数: ${dataCount}`);

          // 実際のデータ内容を表示
          console.log('\n  === 取得データの詳細 ===');
          const dataList =
            studentFacultyStatus.GET_STATUS_LIST.DATALIST_INF.DATA_INF;
          if (dataList && dataList.length > 0) {
            dataList.forEach((data, index) => {
              console.log(`  データ ${index + 1}:`);
              console.log(`    更新日: ${data.UPDATE_DATE}`);

              // データのサマリーを表示
              console.log('    === データサマリー ===');
              const content = data.CONTENT;
              if (content.GAKKO) {
                console.log(`    大学名: ${content.GAKKO.GAKKO_MEI}`);
                console.log(`    所在地: ${content.GAKKO.GAKKO_ADDR}`);
              }

              if (content.GAKUSEI_SU && content.GAKUSEI_SU.CHUYA_KBN) {
                const daytime = content.GAKUSEI_SU.CHUYA_KBN.find(
                  (c) => c.CHUYA_MEI === '昼間',
                );
                if (daytime) {
                  console.log(
                    `    学生総数: ${daytime.GAKUSEI_SU_KEI}人（男性${daytime.GAKUSEI_SU_KEI_M}人、女性${daytime.GAKUSEI_SU_KEI_F}人）`,
                  );
                }
              }

              if (content.KYOIN_SU_HOMMUSHA && content.KYOIN_SU_HOMMUSHA.KEI) {
                const kyoinTotal = content.KYOIN_SU_HOMMUSHA.KEI[0];
                console.log(
                  `    教員総数: ${kyoinTotal.KYOIN_SU_KEI}人（男性${kyoinTotal.KYOIN_SU_KEI_M}人、女性${kyoinTotal.KYOIN_SU_KEI_F}人）`,
                );
              }

              if (content.SHOKUIN_SU && content.SHOKUIN_SU[0]) {
                const shokuin = content.SHOKUIN_SU[0];
                console.log(
                  `    職員総数: ${shokuin.SHOKUIN_SU_KEI}人（男性${shokuin.SHOKUIN_SU_KEI_M}人、女性${shokuin.SHOKUIN_SU_KEI_F}人）`,
                );
              }

              console.log(
                '\n    ※ 詳細データをJSONで確認したい場合は、コードを編集してください',
              );
            });
          }
        }
      } catch (error) {
        console.error(`  APIエラー: ${error.message}`);
      }
    } else {
      console.log('\n3. API呼び出し例:');
      console.log('  ※ アクセスキーを設定するとAPI呼び出しを実行できます');
      console.log('  ※ ACCESS_KEY変数にあなたのアクセスキーを設定してください');
    }

    // 4. 複数のAPIメソッドの使用例
    if (
      ACCESS_KEY !== 'YOUR_ACCESS_KEY_HERE' &&
      ACCESS_KEY !== '' &&
      allUnivIds &&
      allUnivIds.length > 0
    ) {
      console.log('\n4. 複数API呼び出し例:');
      const testUnivId = allUnivIds[0].UNIV_ID; // 実際に取得できた大学IDを使用

      const apiMethods = [
        { name: '学生教員等状況票', method: 'getStudentFacultyStatus' },
        { name: '学校施設調査票', method: 'getSchoolFacilities' },
      ];

      for (const api of apiMethods) {
        try {
          console.log(`  ${api.name}を取得中...`);
          const result = await PortraitsAPI[api.method](
            ACCESS_KEY,
            2024,
            testUnivId,
          );
          const status = result.GET_STATUS_LIST.RESULT.STATUS;
          console.log(
            `    ステータス: ${status === '0' ? '成功' : 'データなし'}`,
          );
        } catch (error) {
          console.log(`    エラー: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error('実行中にエラーが発生しました:', error.message);
  }
}

// 実行
console.log('Portraits API Node.js版の実行を開始します...\n');
main()
  .then(() => {
    console.log('\n実行完了');
  })
  .catch((error) => {
    console.error('実行エラー:', error.message);
  });
