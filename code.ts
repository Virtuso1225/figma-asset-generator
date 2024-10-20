// src/main.ts

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { Buffer } from "buffer";
// AWS 설정
const REGION = 'us-west-2'; // 예: 'us-west-2'
const IDENTITY_POOL_ID = 'us-west-2:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'; // 실제 Identity Pool ID
const BUCKET_NAME = 'your-bucket-name'; // S3 버킷 이름

// S3 클라이언트 생성
const s3 = new S3Client({
  region: REGION,
  credentials: fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: REGION }),
    identityPoolId: IDENTITY_POOL_ID,
  }),
});


// Figma UI 표시
figma.showUI(__html__, { width: 400, height: 500 });

// 선택된 에셋 정보 수집 및 UI로 전송
async function getSelectedAssetInfo() {
  
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    return { message: "에셋이 선택되지 않았습니다." };
  }

  const node = selection[0];

  // 지원되는 노드 유형 확인 (예: 이미지 노드)
  if ("exportAsync" in node && (node.type === "FRAME" || node.type === "RECTANGLE" || node.type === "ELLIPSE" || node.type === "POLYGON" || node.type === "STAR" || node.type === "VECTOR" || node.type === 'GROUP')) {
    try {
      // 에셋 내보내기 (PNG 형식 및 스케일 설정)
      const defaultFormat = 'PNG';
      const defaultScale = 2;
      const imageData = await node.exportAsync({ format: defaultFormat, constraint: { type: 'SCALE', value: defaultScale } });
            
      // ArrayBuffer를 Base64로 변환
      const base64 = Buffer.from(imageData).toString('base64');
      const dataURI = `data:image/${defaultFormat.toLowerCase()};base64,${base64}`;

      return {
        type: node.type,
        name: node.name,
        image: dataURI, // UI에서 이미지를 표시하기 위해 data URL 사용
      };
    } catch (error) {
      console.error("에셋 내보내기 오류:", error);
      return { message: "에셋 내보내기에 실패했습니다." };
    }
  } else {
    return { message: "지원되지 않는 노드 유형입니다." };
  }
  
}

// 플러그인 시작 시 선택한 에셋 정보 UI로 전송
figma.on('selectionchange', async () => {
  getSelectedAssetInfo().then(assetInfo => {
    figma.ui.postMessage({ type: 'selected-asset', payload: assetInfo });
  });
})

// UI에서 메시지 수신
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'upload-asset') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.notify("에셋을 선택해주세요.");
      return;
    }

    const node = selection[0];
    if ("exportAsync" in node) {
      try {
        const defaultFormat = 'PNG';
        const defaultScale = 2;
        const imageData = await node.exportAsync({ format: defaultFormat, constraint: { type: 'SCALE', value: defaultScale } });
        const filename = `assets/${Date.now()}-asset.png`;

        // S3에 파일 업로드
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: filename,
          Body: imageData,
          ContentType: 'image/png',
          ACL: 'public-read',
        });

        await s3.send(command);
        console.log("Upload succeeded");

        const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${filename}`;
        figma.ui.postMessage({ type: 'upload-success', url: url });
        figma.notify("업로드 성공!");

        figma.closePlugin();
      } catch (error) {
        console.error("업로드 오류:", error);
        figma.notify("업로드 중 오류가 발생했습니다.");
      }
    } else {
      figma.notify("지원되지 않는 노드입니다.");
    }
  }
};