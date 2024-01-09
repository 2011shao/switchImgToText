import { bitable, FieldType, ITable } from "@lark-base-open/js-sdk";
import { ref } from "vue";
let bit_table: ITable;
const bit_loading = ref(false);
const bit_all_fieldList = ref<any>([{ name: "ddd", id: "111", type: 1 }]);
const bit_all_table = ref<any>([])
const bit_select_dic = ref<any>({
  baseId: "", fieldId: "", recordId: "", tableId: "", viewId: "",
})
const import_table_id=ref('')//导入人员时的表
const export_table_id=ref('')//导出人员时的表

bitable.base.onSelectionChange((event) => {
  // initBaeData();
  console.log('对对对', event)
  if (event.data.tableId != bit_select_dic.value.tableId) {

    initBaeData()

  }
  bit_select_dic.value = event.data

});

async function initBaeData() {
  // bit_loading.value = true;
  bit_table = await bitable.base.getActiveTable();
  bit_select_dic.value.tableId = bit_table.id
  console.log('dd', bit_table)
  getAllField(true);
}
async function getAllField(loadCache = false) {
  bit_loading.value = true;
  const fieldMetaList = await bit_table.getFieldMetaList();
  console.log("所有的字段", fieldMetaList);
  bit_all_fieldList.value = fieldMetaList;
  bit_loading.value = false;
}
initBaeData();
export { initBaeData, getAllField,import_table_id,export_table_id }
// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// 新增字段
async function addBitNewField(fileName, fieldType = FieldType.Text) {
  const czItem = bit_all_fieldList.value.find((a) => a["name"] == fileName);
  if (czItem) {
    return czItem.id
  } else {
    const fileId = await bit_table.addField({
      type: fieldType,
      name: fileName,
    });
    await getAllField();
    return fileId;
  }
}
// 新增记录
async function addBitRecord(arr) {
  const res = await bit_table.addRecords(arr);
  //   {
  //     fields: {
  //       [field.id]: 'new text field value1'
  //     }
  //   },
  //   {
  //     fields: {
  //       [field.id]: 'new text field value2'
  //     }
  //   },

}

export { bit_all_fieldList, bit_loading, bit_table, addBitNewField, addBitRecord };

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// 获取所有的表格
async function getAllTable(loadCache = false) {
  bit_all_table.value = await bitable.base.getTableMetaList();
}
async function addBitNewTable(name) {
  try {
    const { tableId, index } = await bitable.base.addTable({ name: name, fields: [] })
    await getAllTable()
    await bitable.ui.switchToTable(tableId);
  } catch (e) {
  }
}
async function switchTable(tableId) {
  await bitable.ui.switchToTable(tableId);
  initBaeData()

}
getAllTable()
export { getAllTable, bit_all_table, bit_select_dic, addBitNewTable, switchTable }