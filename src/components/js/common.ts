import dayjs, { Dayjs } from "dayjs";
import { cloneDeep } from "lodash";
import { computed, nextTick, ref, watch } from "vue";
import { export_table_id, import_table_id, bit_table, switchTable } from "./superBase";
const stepNumIndex = ref(0);
const dateRangeArr = ref<string[]>([dayjs().startOf("month").format("YYYY-MM-DD"), dayjs().endOf("month").format("YYYY-MM-DD")]);
const noWorkDateArr = ref([]);
const maxLxWorkNum = ref(5); //最大连续工作天数
const maxWorkNum = ref(2000); // 最大工作天数
const maxFreeNum = ref(2000); // 最大休息天数
const freeNum = ref(1); //连续工作后休息的天数
const orderMode = ref(2); //1随机 2顺序
const superWork = ref(false); //是否允许加班
const dataArr = ref([]);
const manArr = ref<any>([]);
const middleArr = ref<any>([]);
// 班次设置
const classArr = ref([
  {
    node: "早班",
    num: 2,
    sex: 3,
    dateRange: ["02:00", "10:00"],
    field: "field_1",
  },
  {
    node: "白班",
    num: 2,
    sex: 3,
    dateRange: ["10:00", "18:00"],
    field: "field_2",
  },
  {
    node: "晚班",
    num: 2,
    sex: 3,
    dateRange: ["18:00", "02:00"],
    field: "field_3",
  },
]);
// const nodeDic = ref({ zao: 2, zhong: 3, wan: 2 });
function getAllDateFromDateRange() {
  const startDate = dateRangeArr.value[0];
  const endDate = dateRangeArr.value[1];
  let currentDate = startDate;
  const dateRange = [];
  while (currentDate <= endDate) {
    dateRange.push(currentDate);
    currentDate = dayjs(currentDate).add(1, "day").format("YYYY-MM-DD");
  }
  return dateRange;
}
// 人员设置项 同步设置
function updateManSet() {
  for (let man of manArr.value) {
    man["freeNum"] = maxFreeNum.value;
    man["maxLxWorkNum"] = maxLxWorkNum.value;
    for (let node of classArr.value) {
      man[node.node] = [];
      man["jiabanWorkArr"] = [];
    }
  }
  middleArr.value = cloneDeep(manArr.value);
}

// 人员充足时 安排人员工作
function setManWork(node, canWorkMan, dateStr, dayWorkDic, jiaban = false) {
  let man = "";
  for (let j = 0; j < node.num; j++) {
    if (j >= canWorkMan.length) {
      continue;
    }
    let randomInt = 0;
    // 1随机 2 顺序
    if (orderMode.value == 1) {
      randomInt = Math.floor(Math.random() * canWorkMan.length); // 生成一个1-10的随机整数
      man = canWorkMan.splice(randomInt, 1)[0];
    } else {
      randomInt = j;
      man = canWorkMan[randomInt];
    }
    man["workDateArr"].push(dateStr);
    if (jiaban) {
      man["jiabanWorkArr"].push(dateStr);
    }
    // 记录每个人每个班的日期
    man[node.node].push(dateStr);
    dayWorkDic[node.node].push(man);
  }
}

// ... 其他代码
function computedWork() {
  dataArr.value = [];
  const allDateArr = getAllDateFromDateRange();
  let totalNum = 0;
  updateManSet();
  for (let dateStr of allDateArr) {
    let dayWorkDic = {
      date: dateStr,
    };
    for (let node of classArr.value) {
      // 当前班次需要的数据
      const num = node.num;
      const sex = node.sex;
      dayWorkDic[node.node] = [];
      // 全员休息
      if (noWorkDateArr.value.includes(dateStr)) {
        dayWorkDic["remark"] = "全员休息";
        continue;
      }
      const canWorkMan = getCanAllMan(dateStr, sex);
      if (canWorkMan.length >= num) {
        setManWork(node, canWorkMan, dateStr, dayWorkDic);
        // let man = ""
        // for (let j = 0; j < num; j++) {
        //   let randomInt = 0
        //   // 1随机 2 顺序
        //   if (orderMode.value == 1) {
        //     randomInt = Math.floor(Math.random() * canWorkMan.length); // 生成一个1-10的随机整数
        //     man = canWorkMan.splice(randomInt, 1)[0];

        //   } else {
        //     randomInt = j
        //     man = canWorkMan[randomInt]
        //   }
        //   man["workDateArr"].push(dateStr);
        //   // 记录每个人每个班的日期
        //   man[node.node].push(dateStr)
        //   dayWorkDic[node.node].push(man);
        // }
      } else {
        // 允许加班
        if (superWork.value) {
          const canWorkMan = getCanAllMan(dateStr, sex, true);
          debugger;
          setManWork(node, canWorkMan, dateStr, dayWorkDic, true);
          continue;
        }
        console.log(num - canWorkMan.length);
        totalNum = totalNum + (num - canWorkMan.length);
        dayWorkDic["remark"] = `${dateStr}~${node}人员不足`;
      }
    }
    dataArr.value.push(dayWorkDic);
  }
}
function getCanAllMan(dateStr, sex = 3, jiaban = false) {
  let result = [];
  for (let item of middleArr.value) {
    // 性别不符合
    if (sex < 3 && item["sex"] != sex) {
      continue;
    }
    // 过滤掉 不能工作的
    if (!item["canWork"]) {
      continue;
    }
    //  过滤掉 当天排过班的     开启加班则失效
    if (item.workDateArr.includes(dateStr) && !jiaban) {
      continue;
    }
    //    过滤已经最大工作日    开启加班则失效
    if (item.workDateArr.length > maxWorkNum.value && !jiaban) {
      continue;
    }

    // 连续工作天数 小于最多联系工作天数
    if (item.workDateArr.length < maxLxWorkNum.value) {
      result.push(item);
      continue;
    }
    // 日期排序 联系工作日期次数 大于 最大工作次数
    item.workDateArr = item.workDateArr.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    // 判断 是否有连续工作的日期
    const lastThreeDates = item.workDateArr.slice(-3).map((date) => new Date(date).getTime());
    const isLxWork = Math.abs(lastThreeDates[0] - lastThreeDates[1]) === 86400000 && Math.abs(lastThreeDates[1] - lastThreeDates[2]) === 86400000;
    const next = dayjs(lastThreeDates[2]).add(1, "day").format("YYYY-MM-DD");
    // 连续工作 且 当前日期 不是连续工作的下一天
    if (isLxWork && next == dateStr) {
      // 当系统允许加班且用户也允许加班 才可以加班
      if (jiaban && item["superWork"]) {
        result.push(item);
        continue;
      }
      if (!item.freeDateArr.includes(dateStr)) {
        item.freeDateArr.push(dateStr);
      }
    } else {
      result.push(item);
    }
  }
  // 工作天数 工作的过得往后排
  result = result.sort(function (a, b) {
    return a["workDateArr"]["length"] - b["workDateArr"]["length"];
  });
  return result;
}

// tab 切换
function switchTabIndex(e) {
  stepNumIndex.value = e;
 
}
watch(stepNumIndex,()=>{
  debugger
  if (stepNumIndex.value == 5) {
    if (export_table_id.value && export_table_id.value!=bit_table.id) {
      switchTable(export_table_id.value)
    }
    // computedWork()
  }else{
    if (import_table_id.value && import_table_id.value!=bit_table.id) {
      switchTable(import_table_id.value)
    }
  }
})
// 每天需要多少人工作
const dayWorkManNum = computed(() => {
  let num = 0;
  for (let item of classArr.value) {
    num = num + item["num"];
  }
  return num;
});
// 满足工作 最少需要的人数
const minManWorkNum = computed(() => {
  // 最少的人数
  const num = Math.ceil((freeNum.value * dayWorkManNum.value) / maxLxWorkNum.value) + dayWorkManNum.value;
  const date1 = dayjs(dateRangeArr.value[0]);
  const date2 = dayjs(dateRangeArr.value[1]);
  const diff = date2.diff(date1, "day");
  const cycleDayNum = maxLxWorkNum.value + freeNum.value;
  if (diff > cycleDayNum) {
    return num;
  } else {
    return dayWorkManNum.value;
  }
});
export { manArr, middleArr, classArr, superWork, freeNum, minManWorkNum, dataArr, dateRangeArr, maxLxWorkNum, maxWorkNum, maxFreeNum, orderMode, noWorkDateArr, stepNumIndex };

export { computedWork, switchTabIndex };
