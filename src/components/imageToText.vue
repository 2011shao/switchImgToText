
<template>
  <div>
    <a-typography-text
      >免费OCR识别,更多模型解析持续更新中
      <!-- <a-typography-text type="primary" @click="helpVoid">
        查看教程
      </a-typography-text> -->
    </a-typography-text>
    <a-spin :loading="bit_loading" style="width: 100%" class="m-t-10">
      <div class="grid-one p-all-1 grid-gap-5">
        <SelectField
          title="图片字段"
          v-model="bit_import_dic.origin_filed"
          :typeNumArr="[17]"
          :preSetArr="['图片', '附件']"
          :allFieldDic="bit_import_dic"
        ></SelectField>
        <div class="row-start-center">
          <a-typography-text class="labelCss">图片类型</a-typography-text>
          <a-select
            v-model="selectMode"
            :options="modeOptions"
            placeholder="解析模型"
          ></a-select>
        </div>

        <SelectField
          canAdd
          v-if="selectMode == 'all'"
          title="存放字段"
          v-model="bit_import_dic.target_filed"
          :typeNumArr="[1]"
          :preSetArr="['存放']"
          :allFieldDic="bit_import_dic"
        ></SelectField>
        <a-checkbox-group
          direction="vertical"
          v-if="selectMode == 'bank'"
          v-model="select_import_arr"
        >
          <a-checkbox value="bankNo">银行卡号</a-checkbox>
          <a-checkbox value="bankName">所属银行</a-checkbox>
          <a-checkbox value="mothYear">有效期</a-checkbox>
          <a-checkbox value="cardTypeName">银行类型</a-checkbox>
        </a-checkbox-group>

        <a-button
          :loading="buttonLoading"
          :disabled="!commitCan"
          type="primary"
          @click="exportVoid"
          >开始解析</a-button
        >
        <a-progress v-if="buttonLoading" :percent="progress" />
      </div>
    </a-spin>
  </div>
</template>

<script setup >
import { ref, onMounted, computed, watch, onUnmounted } from "vue";
import { Message } from "@arco-design/web-vue";
import SelectField from "./superView/SelectField.vue";
import { getBankBin, getAliBankCheck } from "./bankjs/superBank";
import { bit_loading, bit_table, addBitNewField } from "./js/superBase";
import axios from "axios";
const buttonLoading = ref(false);
const bit_import_dic = ref({
  origin_filed: "",
  target_filed: "",
});
const modeOptions = [
  { label: "通用", value: "all" },
  { label: "银行卡", value: "bank" },
];
const selectMode = ref("all");
const select_import_arr = ref([]);
const progress = ref(0);

// 导出word
async function exportVoid() {
  progress.value = 0;
  buttonLoading.value = true;
  bit_loading.value = true;
  let target_filed_dic = {};
  for (let key of select_import_arr.value) {
    let name = "";
    if (key == "bankNo") {
      name = "银行卡号";
    }
    if (key == "bankName") {
      name = "所属银行";
    }
    if (key == "mothYear") {
      name = "有效期";
    }
    if (key == "cardTypeName") {
      name = "银行卡类型";
    }
    const fileId = await addBitNewField(name);
    target_filed_dic[key] = fileId;
  }

  const recordList = await bit_table.getRecordList();
  const view = await bit_table.getActiveView();
  const recordIdList = await view.getVisibleRecordIdList();
  let newDataArr = [];
  let i = 0;
  const attachmentField = await bit_table.getField(
    bit_import_dic.value.origin_filed
  );
  for (const record of recordList) {
    if (!recordIdList.includes(record.id)) {
      continue;
    }
    const imgArr = await attachmentField.getAttachmentUrls(record.id);
    let textContent = [];
    for (let url of imgArr) {
      const textRes = await axios.get(
        `https://wk.mobilenail.vip/ocr?image_url=${url}`
      );
      let textStr = await switchResult(textRes.data);
      if (textStr) {
        textContent.push(textStr);
      }
    }
    const dic = {
      recordId: record.id,
      fields: {},
    };
    if (selectMode.value == "all") {
      dic.fields[bit_import_dic.value.target_filed] = textContent.join(",");
    } else {
      for (let [key, value] of Object.entries(target_filed_dic)) {
        dic.fields[value] = textContent.map((a) => a[key]).join(",");
      }
    }

    newDataArr.push(dic);
    i++;
    progress.value = parseInt(i / recordIdList.length);
  }
  await bit_table.setRecords(newDataArr);
  Message.success("解析完成");
  buttonLoading.value = false;
  bit_loading.value = false;
}

async function switchResult(inputString) {
  if (selectMode.value == "all") {
    return inputString;
  }
  if (selectMode.value == "bank") {
    const mothYear = inputString.match(/(\d{2})\/(\d{2})/g);
    inputString = inputString.replace(/(\d{2})\/(\d{2})/g, "");
    inputString = inputString.replace(/\D/g, "");
    const result = await getBankInfo(inputString, 16);
    if (result) {
      if (mothYear) {
        Object.assign(result, { mothYear });
      }
    }
    return result;
  }
}

// 银行卡信息
async function getBankInfo(str, len) {
  if (str.length > 15) {
    const bankNo = str.substring(0, len);
    const bankDic = await getBankBin(bankNo);
    if (bankDic) {
      const checkDic = await getAliBankCheck(bankNo);
      if (checkDic) {
        return Object.assign(bankDic, checkDic, { pass: true });
      } else {
        return Object.assign(bankDic, { pass: false });
      }
    } else {
      if (str.length >= len + 1) {
        return await getBankInfo(str, len + 1);
      }
    }
  }
}

const commitCan = computed(() => {
  if (bit_import_dic.value.origin_filed) {
    if (selectMode.value == "all" && bit_import_dic.value.target_filed) {
      return true;
    }
    if (selectMode.value == "bank" && select_import_arr.value.length > 0) {
      return true;
    }
  }
  return false;
});
function helpVoid(params) {
  window.open(
    "https://y35xdslz6g.feishu.cn/docx/QB5udpPFgotthpxKRaJcSaTmnOM?from=from_copylink",
    "_blank"
  );
}
</script>
<style>
.labelCss {
  width: 70px;
  text-align: center;
  flex-shrink: 0;
}
</style>
