import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ChatDetailScreen() {
  const { name } = useLocalSearchParams();
  const router = useRouter(); 
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  
  const getAvatar = (userName: any) => {
    const idMap: any = { '林語安': 1, '吳奕辰': 2, '陳米雅': 3, '王大同': 4, '李若依': 5, '張家瑋': 6, '徐子涵': 7, '周杰倫': 8, '蔡依林': 9, '助教本人': 10 };
    return `https://i.pravatar.cc/100?u=${idMap[userName] || 1}`;
  };

  const getInitialMessages = (userName: any) => {
    switch (userName) {
      case '林語安':
        return [
          { id: 1, text: '語安，你家那隻貓昨天是不是又拆家了？', type: 'out' },
          { id: 2, text: '別提了，牠把我最愛的耳機線咬斷了...', type: 'in' },
          { id: 3, text: '天啊，那是你剛買的耶，牠還好嗎？', type: 'out' },
          { id: 4, text: '牠現在一臉無辜地躺在沙發上，我罵不下去。', type: 'in' },
          { id: 5, text: '這就是養貓的宿命，習慣就好。', type: 'out' },
          { id: 6, text: '你說得對，我等下要去買新的，要順便幫你帶咖啡嗎？', type: 'in' },
          { id: 7, text: '好啊，我要熱拿鐵去冰。', type: 'out' },
          { id: 8, text: '沒問題，你還在圖書館趕專題？', type: 'in' },
          { id: 9, text: '對，那個 UI 畫面調好久，快崩潰。', type: 'out' },
          { id: 10, text: '加油，你寫的 App 真的很有美感！', type: 'in' },
          { id: 11, text: '謝謝，希望助教也會這麼覺得。', type: 'out' },
          { id: 12, text: '一定會的啦，你有這方面的天賦。', type: 'in' },
          { id: 13, text: '話說你明天要來社團聚餐嗎？', type: 'out' },
          { id: 14, text: '看我進度，如果寫得順就去。', type: 'in' },
          { id: 15, text: '別給自己太大壓力，偶爾要放鬆。', type: 'out' },
          { id: 16, text: '好啦，我會注意的。', type: 'in' },
          { id: 17, text: '那貓咪的飼料還有嗎？要不要幫你帶？', type: 'out' },
          { id: 18, text: '還有半袋，暫時不用，謝啦！', type: 'in' },
          { id: 19, text: '好，那我先繼續寫 Code 了。', type: 'out' },
          { id: 20, text: '辛苦了，晚點幫你送咖啡過去。', type: 'in' },
          { id: 21, text: '謝啦，你是救星。', type: 'out' },
          { id: 22, text: '沒問題，明天圖書館見！', type: 'in' },
        ];
      case '吳奕辰':
        return [
          { id: 1, text: '奕辰，晚上的籃球賽你還打嗎？', type: 'out' },
          { id: 2, text: '打啊！我昨天熱身好久。', type: 'in' },
          { id: 3, text: '但你的腳踝不是還在腫？', type: 'out' },
          { id: 4, text: '好多了，我今天噴了止痛。', type: 'in' },
          { id: 5, text: '你瘋了喔，這樣受傷更重怎麼辦。', type: 'out' },
          { id: 6, text: '這場很重要，我想幫班上贏。', type: 'in' },
          { id: 7, text: '好吧，但如果不舒服一定要下來。', type: 'out' },
          { id: 8, text: '我知道，我不會硬撐的。', type: 'in' },
          { id: 9, text: '對了，球衣我幫你洗好了。', type: 'out' },
          { id: 10, text: '喔喔感恩！我等下去找你拿。', type: 'in' },
          { id: 11, text: '我在交誼廳這，你慢慢來。', type: 'out' },
          { id: 12, text: '你有吃晚餐嗎？', type: 'in' },
          { id: 13, text: '還沒，想說打完球再去吃。', type: 'out' },
          { id: 14, text: '這樣體力不夠吧，要不要我買飯糰？', type: 'in' },
          { id: 15, text: '好啊，那幫我買個鮪魚口味的。', type: 'out' },
          { id: 16, text: '沒問題，我等下順便買運動飲料。', type: 'in' },
          { id: 17, text: '讚喔，這場我們一定要贏！', type: 'out' },
          { id: 18, text: '那當然，有你在禁區我很放心。', type: 'in' },
          { id: 19, text: '哈哈，別給我壓力。', type: 'out' },
          { id: 20, text: '這不是壓力，是信任。', type: 'in' },
          { id: 21, text: '好，場上見。', type: 'out' },
          { id: 22, text: '那我先去訂位喔。', type: 'in' },
        ];
      case '陳米雅':
        return [
          { id: 1, text: '米雅，那家甜點店的照片我修好了！', type: 'out' },
          { id: 2, text: '真的嗎！快傳給我看看。', type: 'in' },
          { id: 3, text: '傳到雲端了，這張你超正。', type: 'out' },
          { id: 4, text: '哇！你調的色調好溫柔喔。', type: 'in' },
          { id: 5, text: '因為現場光線真的很棒。', type: 'out' },
          { id: 6, text: '我這週還要再去另一家，要跟嗎？', type: 'in' },
          { id: 7, text: '這週喔...我作業還沒寫完 Q_Q', type: 'out' },
          { id: 8, text: '先去吃完心情好，寫得更快啦。', type: 'in' },
          { id: 9, text: '你這理由很難反駁耶哈哈。', type: 'out' },
          { id: 10, text: '對吧，那禮拜六下午三點見？', type: 'in' },
          { id: 11, text: '好啦，豁出去了。', type: 'out' },
          { id: 12, text: '那我這幾天要先減肥一下。', type: 'in' },
          { id: 13, text: '你又不胖，多吃點草莓塔沒差。', type: 'out' },
          { id: 14, text: '哈哈，聽你說話就是開心。', type: 'in' },
          { id: 15, text: '對了，你那件洋裝在哪買的？', type: 'out' },
          { id: 16, text: '在那家韓系代購，你要連結嗎？', type: 'in' },
          { id: 17, text: '要！那套質感超好。', type: 'out' },
          { id: 18, text: '發給你了，我們這週可以穿姊妹裝。', type: 'in' },
          { id: 19, text: '好啊，那我也要買那雙鞋。', type: 'out' },
          { id: 20, text: '沒問題，那我們就這樣約囉。', type: 'in' },
          { id: 21, text: '期待週末。', type: 'out' },
          { id: 22, text: '這張照片拍得超好看！', type: 'in' },
        ];
      case '王大同':
        return [
          { id: 1, text: '大同，你看這個冷笑話。', type: 'out' },
          { id: 2, text: '拜託不要，我還在上班耶。', type: 'in' },
          { id: 3, text: '什麼是魚最討厭的事情？', type: 'out' },
          { id: 4, text: '不知道，也不想知道。', type: 'in' },
          { id: 5, text: '答案是：釣魚。', type: 'out' },
          { id: 6, text: '......好冷，我辦公室冷氣已經很強了。', type: 'in' },
          { id: 7, text: '哈哈，心情有好點嗎？', type: 'out' },
          { id: 8, text: '有啦，被你冷到都清醒了。', type: 'in' },
          { id: 9, text: '對了，昨天的專題進度報得怎樣？', type: 'out' },
          { id: 10, text: '教授沒說什麼，應該是過關。', type: 'in' },
          { id: 11, text: '那就好，你之前還擔心得要命。', type: 'out' },
          { id: 12, text: '我是怕被問到那個 API 串接。', type: 'in' },
          { id: 13, text: '那部分你不是寫得很穩嗎？', type: 'out' },
          { id: 14, text: '還是會緊張啊，萬一當場 Bug 就慘了。', type: 'in' },
          { id: 15, text: '沒事啦，你實力很強的。', type: 'out' },
          { id: 16, text: '謝啦，等下下班去喝一杯？', type: 'in' },
          { id: 17, text: '好啊，老地方見。', type: 'out' },
          { id: 18, text: '今天我請客，慶祝過關。', type: 'in' },
          { id: 19, text: '那我要點大份炸雞。', type: 'out' },
          { id: 20, text: '沒問題，管飽。', type: 'in' },
          { id: 21, text: '等你喔。', type: 'out' },
          { id: 22, text: '笑死我了，這梗圖哪來的？', type: 'in' },
        ];
      case '李若依':
        return [
          { id: 1, text: '若依，今天實習還順利嗎？', type: 'out' },
          { id: 2, text: '好累喔，今天幫經理跑了一整天外勤。', type: 'in' },
          { id: 3, text: '辛苦了，大太陽底下跑外勤真的很磨人。', type: 'out' },
          { id: 4, text: '對啊，我覺得我的腿快斷了。', type: 'in' },
          { id: 5, text: '晚上早點睡，泡個熱水澡。', type: 'out' },
          { id: 6, text: '我想先吃頓好吃的，你人在哪？', type: 'in' },
          { id: 7, text: '我在學校圖書館，剛弄完作業。', type: 'out' },
          { id: 8, text: '那等下要不要去那家拉麵店？', type: 'in' },
          { id: 9, text: '可以啊，那家我也想吃很久了。', type: 'out' },
          { id: 10, text: '那我們七點店門口集合。', type: 'in' },
          { id: 11, text: 'OK，我會準時到。', type: 'out' },
          { id: 12, text: '對了，你上次那本行銷書看完了嗎？', type: 'in' },
          { id: 13, text: '看完了，內容很有幫助。', type: 'out' },
          { id: 14, text: '真的嗎？那可以借我參考嗎？', type: 'in' },
          { id: 15, text: '沒問題，我等下帶給你。', type: 'out' },
          { id: 16, text: '太感謝了，我最近專案剛好缺這塊。', type: 'in' },
          { id: 17, text: '我們互相幫忙啦。', type: 'out' },
          { id: 18, text: '那等下見。', type: 'in' },
          { id: 19, text: '好，路上小心。', type: 'out' },
          { id: 20, text: '會的，你也趕快收拾吧。', type: 'in' },
          { id: 21, text: '掰掰。', type: 'out' },
          { id: 22, text: '那今天晚上八點見。', type: 'in' },
        ];
      case '張家瑋':
        return [
          { id: 1, text: '家瑋，那個 React Native 的效能問題怎麼解？', type: 'out' },
          { id: 2, text: '你是說 FlatList 卡頓的問題嗎？', type: 'in' },
          { id: 3, text: '對，當資料變多的時候滑動很不順。', type: 'out' },
          { id: 4, text: '這很常見，你要檢查你的 renderItem 是不是太重。', type: 'in' },
          { id: 5, text: '我裡面放了好多圖片跟計算。', type: 'out' },
          { id: 6, text: '試著用 memo 把 Item 包起來，然後固定高度。', type: 'in' },
          { id: 7, text: '我來試試看...真的順多了！', type: 'out' },
          { id: 8, text: '不錯喔，這就是開發的優化細節。', type: 'in' },
          { id: 9, text: '家瑋你真的大神，每次問你都秒解。', type: 'out' },
          { id: 10, text: '沒有啦，我也是踩過很多坑才懂。', type: 'in' },
          { id: 11, text: '對了，你有在看今年的開發者大會嗎？', type: 'out' },
          { id: 12, text: '有啊，新的編譯器感覺超強。', type: 'in' },
          { id: 13, text: '我也覺得，希望之後部署能更快。', type: 'out' },
          { id: 14, text: '一定會的，技術進步得很快。', type: 'in' },
          { id: 15, text: '那下午要一起去 Hackathon 報名嗎？', type: 'out' },
          { id: 16, text: '好啊，我們組一隊。', type: 'in' },
          { id: 17, text: '那我們分工一下。', type: 'out' },
          { id: 18, text: '我負責邏輯架構，你負責 UI 如何？', type: 'in' },
          { id: 19, text: '完美組合。', type: 'out' },
          { id: 20, text: '那我先去把基礎框架跑起來。', type: 'in' },
          { id: 21, text: 'OK，等你好消息。', type: 'out' },
          { id: 22, text: 'Repo 我更新好了，你再看下。', type: 'in' },
        ];
      case '徐子涵':
        return [
          { id: 1, text: '子涵，你是不是又在圖書館讀到天亮？', type: 'out' },
          { id: 2, text: '差不多吧，這次的經濟學真的好難。', type: 'in' },
          { id: 3, text: '你要保重身體啦，期中考還沒到就垮了。', type: 'out' },
          { id: 4, text: '沒辦法，我不讀心裡不踏實。', type: 'in' },
          { id: 5, text: '要不要我幫你買早餐送過去？', type: 'out' },
          { id: 6, text: '真的可以嗎？那我要蛋餅跟大溫奶。', type: 'in' },
          { id: 7, text: '好，我十分鐘後到。', type: 'out' },
          { id: 8, text: '子涵你真的是我們班最拼的。', type: 'out' },
          { id: 9, text: '因為我怕考不好會被家裡唸。', type: 'in' },
          { id: 10, text: '壓力別這麼大，你成績已經很好了。', type: 'out' },
          { id: 11, text: '還是要謹慎一點比較好。', type: 'in' },
          { id: 12, text: '對了，你有畫考前重點嗎？', type: 'out' },
          { id: 13, text: '有，我剛整理好一份 PDF。', type: 'in' },
          { id: 14, text: '太感恩了，你真的是學霸。', type: 'out' },
          { id: 15, text: '大家互相幫忙啦。', type: 'in' },
          { id: 16, text: '那考完試要去 KTV 唱歌嗎？', type: 'out' },
          { id: 17, text: '好啊，我也想大聲叫一下。', type: 'in' },
          { id: 18, text: '那我先訂位喔。', type: 'out' },
          { id: 19, text: '沒問題，那天我要唱周杰倫的歌。', type: 'in' },
          { id: 20, text: '哈哈，我也是。', type: 'out' },
          { id: 21, text: '那加油。', type: 'out' },
          { id: 22, text: '作業記得要在期限前交喔。', type: 'in' },
        ];
      case '周杰倫':
        return [
          { id: 1, text: '杰倫哥，最近有什麼音樂靈感嗎？', type: 'out' },
          { id: 2, text: '哎呦，不錯喔，剛在海邊寫了一首。', type: 'in' },
          { id: 3, text: '是像《聽媽媽的話》那種溫馨風嗎？', type: 'out' },
          { id: 4, text: '這次比較酷，節奏感很強。', type: 'in' },
          { id: 5, text: '超期待！每次聽哥的歌都覺得很有溫度。', type: 'out' },
          { id: 6, text: '音樂就是要讓人放鬆，對吧？', type: 'in' },
          { id: 7, text: '真的，我寫 Code 卡住都聽你的歌。', type: 'out' },
          { id: 8, text: '寫程式也要有旋律感，加油。', type: 'in' },
          { id: 9, text: '哥，你覺得成功最重要的特質是什麼？', type: 'out' },
          { id: 10, text: '堅持，還有不要忘記最初的熱情。', type: 'in' },
          { id: 11, text: '我會記住的。', type: 'out' },
          { id: 12, text: '對了，下次巡演想聽什麼歌？', type: 'in' },
          { id: 13, text: '《稻香》！那首超經典。', type: 'out' },
          { id: 14, text: '好，我會把它排進曲目。', type: 'in' },
          { id: 15, text: '哥人真的太好了！', type: 'out' },
          { id: 16, text: '記得多運動，身體是本錢。', type: 'in' },
          { id: 17, text: '我會的，我有在練籃球。', type: 'out' },
          { id: 18, text: '不錯，有機會一起下場。', type: 'in' },
          { id: 19, text: '那我一定會緊張到投不進球哈哈。', type: 'out' },
          { id: 20, text: '平常心，就當作在玩。', type: 'in' },
          { id: 21, text: '好的哥！', type: 'out' },
          { id: 22, text: '期待我的新作品吧！', type: 'in' },
        ];
      case '蔡依林':
        return [
          { id: 1, text: 'Jolin，你的舞蹈是怎麼練到這麼厲害的？', type: 'out' },
          { id: 2, text: '沒有奇蹟，只有累積。', type: 'in' },
          { id: 3, text: '聽說你每天都練到滿身傷？', type: 'out' },
          { id: 4, text: '因為我想給歌迷最好的。', type: 'in' },
          { id: 5, text: '那份專業真的讓人非常敬佩。', type: 'out' },
          { id: 6, text: '謝謝，你也要在你的領域發光。', type: 'in' },
          { id: 7, text: '我會努力把程式寫好，像你跳舞一樣。', type: 'out' },
          { id: 8, text: '專注在每一個細節，就會變得很棒。', type: 'in' },
          { id: 9, text: '妳最近有推薦的書嗎？', type: 'out' },
          { id: 10, text: '《脆弱的力量》，讓我學會擁抱自己。', type: 'in' },
          { id: 11, text: '我也去買來看。', type: 'out' },
          { id: 12, text: '對了，你這次期中專題的主題是什麼？', type: 'in' },
          { id: 13, text: '是一個關於 Messenger 的社交 App。', type: 'out' },
          { id: 14, text: '很有趣的主題，UI 一定要美。', type: 'in' },
          { id: 15, text: '我正朝著這個方向努力。', type: 'out' },
          { id: 16, text: '加油，相信你可以做到。', type: 'in' },
          { id: 17, text: '謝謝 Jolin 的鼓勵！', type: 'out' },
          { id: 18, text: '我也要去練舞了。', type: 'in' },
          { id: 19, text: '好的，加油。', type: 'out' },
          { id: 20, text: '祝你開發順利。', type: 'in' },
          { id: 21, text: '掰掰。', type: 'out' },
          { id: 22, text: '沒問題，明天圖書館見！', type: 'in' },
        ];
      case '助教本人':
        return [
          { id: 1, text: '助教，我這部分的功能好像卡住了。', type: 'out' },
          { id: 2, text: '是哪裡報錯？把紅屏截圖傳給我。', type: 'in' },
          { id: 3, text: '好像是 Module 找不到的問題。', type: 'out' },
          { id: 4, text: '你是不是漏裝了套件？檢查一下 package.json。', type: 'in' },
          { id: 5, text: '啊！真的耶，我忘記 install 了。', type: 'out' },
          { id: 6, text: '下次記得先檢查基礎設定。', type: 'in' },
          { id: 7, text: '好的助教，我會改進。', type: 'out' },
          { id: 8, text: '你的 UI 切得很精緻，有花時間。', type: 'in' },
          { id: 9, text: '對啊，我想要做得跟真的一樣。', type: 'out' },
          { id: 10, text: '有這份心思很棒。', type: 'in' },
          { id: 11, text: '那專題展示要注意什麼？', type: 'out' },
          { id: 12, text: '重點放在功能邏輯跟程式碼架構。', type: 'in' },
          { id: 13, text: '我會把 README 寫清楚。', type: 'out' },
          { id: 14, text: '很好，這對期中分數有幫助。', type: 'in' },
          { id: 15, text: '助教，謝謝你一直以來的幫忙。', type: 'out' },
          { id: 16, text: '不會，教學相長。', type: 'in' },
          { id: 17, text: '那我先去把最後一部分寫完。', type: 'out' },
          { id: 18, text: '好，加油，我看好你。', type: 'in' },
          { id: 19, text: '沒問題。', type: 'out' },
          { id: 20, text: '記得不要熬夜太晚。', type: 'in' },
          { id: 21, text: '收到。', type: 'out' },
          { id: 22, text: '這次期中作業很有水準，加分！', type: 'in' },
        ];
      default:
        return [
          { id: 1, text: `哈囉，${userName}！`, type: 'in' },
          { id: 2, text: '最近過得如何？', type: 'in' },
          { id: 3, text: '忙著寫期中作業。', type: 'out' },
          { id: 4, text: '加油，快結束了。', type: 'in' },
          { id: 5, text: '寫完要去吃大餐嗎？', type: 'out' },
          { id: 6, text: '好啊，那要選哪一家？', type: 'in' },
          { id: 7, text: '燒肉如何？', type: 'out' },
          { id: 8, text: '可以耶，我想吃肉。', type: 'in' },
          { id: 9, text: '那就這麼定了。', type: 'out' },
          { id: 10, text: '耶，有動力寫下去了。', type: 'in' },
          { id: 11, text: '對了，那件事你處理好了嗎？', type: 'out' },
          { id: 12, text: '差不多了，謝謝關心。', type: 'in' },
          { id: 13, text: '沒事就好。', type: 'out' },
          { id: 14, text: '那我們明天再聊。', type: 'in' },
          { id: 15, text: 'OK，掰掰。', type: 'out' },
          { id: 16, text: '掰掰。', type: 'in' },
          { id: 17, text: '加油。', type: 'out' },
          { id: 18, text: '你也是。', type: 'in' },
          { id: 19, text: '晚安。', type: 'out' },
          { id: 20, text: '晚安。', type: 'in' },
          { id: 21, text: '明天見。', type: 'out' },
          { id: 22, text: '沒問題，明天圖書館見！', type: 'in' },
        ];
    }
  };

  // 1. 初始化時先給空陣列
  const [messages, setMessages] = useState<any[]>([]);

  // 2. 加入這個 useEffect，確保每次切換 name 時，都會重新抓取對應的初始訊息
  useEffect(() => {
    setMessages(getInitialMessages(name));
  }, [name]);

  const sendMessage = () => {
    if (inputText.trim().length > 0) {
      const newMsg = inputText;
      setMessages([...messages, { id: Date.now(), text: newMsg, type: 'out' }]);
      setInputText('');
      DeviceEventEmitter.emit('updateLastMsg', { name, msg: newMsg });
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <Stack.Screen options={{ 
        headerShown: true,
        headerTitle: "",
        headerLeft: () => (
          <View style={styles.headerLeftContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><FontAwesome name="chevron-left" size={20} color="#0084FF" /></TouchableOpacity>
            <Image source={{ uri: getAvatar(name) }} style={styles.headerAvatar} />
            <Text style={styles.headerNameText}>{name}</Text>
          </View>
        ),
        headerRight: () => (
          <View style={styles.headerRightContainer}>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="call" size={22} color="#0084FF" /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="videocam" size={24} color="#0084FF" /></TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}><Ionicons name="information-circle" size={24} color="#0084FF" /></TouchableOpacity>
          </View>
        ),
      }} />
      <ScrollView ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })} contentContainerStyle={styles.chatArea}>
        {messages.map((m) => (
          <View key={m.id} style={m.type === 'in' ? styles.inBubble : styles.outBubble}>
            <Text style={m.type === 'in' ? styles.inText : styles.outText}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.inputContainer}>
        <TextInput style={styles.input} placeholder="傳送訊息..." value={inputText} onChangeText={setInputText} onSubmitEditing={sendMessage} returnKeyType="send" />
        <TouchableOpacity onPress={sendMessage}><FontAwesome name="send" size={20} color="#0084FF" style={{ marginLeft: 15 }} /></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerLeftContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  backBtn: { paddingRight: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerNameText: { fontSize: 16, fontWeight: 'bold' },
  headerRightContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  iconBtn: { paddingHorizontal: 8 },
  chatArea: { padding: 15, paddingBottom: 20 },
  inBubble: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 10, maxWidth: '80%' },
  outBubble: { backgroundColor: '#0084FF', padding: 12, borderRadius: 20, alignSelf: 'flex-end', marginBottom: 10, maxWidth: '80%' },
  inText: { fontSize: 16, color: '#000' },
  outText: { fontSize: 16, color: '#fff' },
  inputContainer: { flexDirection: 'row', padding: 10, alignItems: 'center', borderTopWidth: 0.5, borderTopColor: '#eee', paddingBottom: Platform.OS === 'ios' ? 30 : 10, backgroundColor: '#fff' },
  input: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, fontSize: 16 },
});