// 과학 도감 카드 그림. 16×16 도트를 글자 한 칸이 한 점인 그림판으로 적고, 크게 키워 그린다.
// 아직 열리지 않은 카드는 같은 모양을 한 가지 색의 그림자로 그린다.
const P = {
  k: '#2a2230', w: '#ffffff', W: '#f4ede0', g: '#c0c4cc', G: '#8a93a3', d: '#4a5160', x: '#15151c',
  y: '#ffd84a', Y: '#f5b82e', o: '#f08a24', f: '#fff3b0', r: '#e0503c', R: '#a8322a', p: '#f7a8c4',
  b: '#3a7bd5', B: '#24508f', c: '#8fd3ff', C: '#d4efff', z: '#1c2a4c', q: '#5f3aa0', v: '#8a5bd6', V: '#cdb0ff',
  n: '#3aa04b', N: '#24703a', l: '#9be070', j: '#c8f060', a: '#2fb6a6',
  m: '#8a5a2b', M: '#5b3a1c', t: '#d9b37a', T: '#f0dca6', e: '#b5814e', u: '#c9772b', s: '#f2c9a0',
};

export const ART = {
  // ---------------------------------------------------------------- 햇살 농장 지구
  season: [
    '................', '.....kkkkkk.....', '...kkpppnnnkk...', '..kppwppnnlnnk..', '..kpwpwpnlnnnk..', '.kpppwppnnnnlnk.', '.kppppppnnlnnnk.', '.kpwppppnnnnnnk.',
    '.kCCCCwCooooYok.', '.kCwCCCCoYooook.', '.kCCCwCCooooYok.', '..kCwCCCoYoook..', '..kCCCwCooooYk..', '...kkCCCoookk...', '.....kkkkkk.....'],
  rotation: [
    '..........r.....', '.....kkkkr......', '...kbbnnrbbk....', '..kbnnnbrbnbk...', '..kbbnnrbnnbk...', '..kbbbbrnnnbk...', '..knbbrbbnbbk...', '..knnbrbbbbbk...',
    '...knrbbbbbk....', '....krbbnbk.....', '....rkkkkk......', '...r........y...', '..yyyyyyyyyyyy..', '............y...'],
  revolution: [
    '................', '................', '.....cccccc.....', '...cc......cc...', '..c..........c..', '.c....yyy.....c.', '.c...yyfyy...kk.', 'c....yyyyy..kbnk',
    '.c...yyyyy...kk.', '.c....yyy.....c.', '..c..........c..', '...cc......cc...', '.....cccccc.....'],
  'sun-altitude': [
    '...........yyy..', '..........yyyyy.', '..........yyfyy.', '...........yyy..', '.........f......', '................', '.......f........', '................',
    '.....f..........', '................', '...f.r..........', '......r.........', '..k...r.........', 'mmmmmmmmmmmmmmmm', 'eeeeeeeeeeeeeeee'],
  altimeter: [
    '................', '................', '.....k..........', '.....mw.........', '.....m.w........', '.....m.w........', '.....m..w.......', '.....m...w......',
    '.....m...w......', '.....m....wccc..', '.....m....cw..c.', '.....m...c..w..c', 'tttttmddddddkttt', 'mmmmmmmmmmmmmmmm'],
  'shadow-length': [
    '............yyy.', '...........yyyyy', '............yyy.', '................', '.........k......', '.........m......', '.........m......', '.........m......',
    '.........m......', '.........m......', '.........m......', '.........m......', '.ddddddddm......', 'YkYYkYYkYYkYYkYY', 'YYYYYYYYYYYYYYYY'],
  inclinometer: [
    '............yy..', '...........yyyy.', '............yy..', '................', '.....kkkkkk.....', '...kkWWWWWWkk...', '..kWWkWWWWkWWk..', '.kWkWWWWWWWWkWk.', '.kWWWWWWWWWrWWk.', 'kWWWWWWWWWrWWWWk', 'kWWWWWWWWrWWWWWk', 'kWWWWWWWrWWWWWWk', 'kkkkkkkkkkkkkkkk'],
  'sun-safety': [
    '................', '.yyy............', 'yyfyy...........', '.yyy............', '...rr...........', '....rr..........', '....krrkkkkk....', '..kkWWrrbWWWkk..',
    '.kWWWWbrrbWWWWk.', '.kWWWWbxrrWWWWk.', '..kkWWWbbrrWkk..', '....kkkkkkrr....', '...........rr...', '............rr..'],
  'noon-altitude': [
    '.......yy.......', '......yyyy......', '......yfyy......', '.......yy.......', '.....o....o.....', '....o..g...o....', '...o........o...', '..o....g.....o..',
    '..o..........o..', '.o.....g......o.', '.o............o.', '.......g........', 'nnnnnnnnnnnnnnnn', 'eeeeeeeeeeeeeeee'],
  screen: [
    '................', '....kkkkkkkk....', '...kWWWWWWWWk...', '..kkkkkkkkkkkk..', '...kWgWgWgWgk...', '...kgWgWgWgWk...', '...kWgWgWgWgk...', '...kgWgWgWgWk...',
    '...kWgWgWgWgk...', '...kkkkkkkkkk...', '....k......k....', '....k......k....', '....k......k....', 'nnnnknnnnnnknnnn', 'NNNNNNNNNNNNNNNN'],
  'line-graph': [
    '.k..............', '.k..............', '.k..............', '.k..........R...', '.k.........b....', '.k....R...b.....', '.k...b.bb.b.....', '.k...b...R......',
    '.k..b...........', '.k..b...........', '.k.R............', '.k..............', '.k..............', '.kkkkkkkkkkkkkkk'],
  'peak-temp': [
    '......kkk.......', '.....kWWWk...yy.', '.....kWWWkk.yyyy', '.....kWrWk...yy.', '.....kWrWkk.....', '.....kWrWk......', '.....kWrWkk.....', '.....kWrWk......',
    '.....kWrWkk.....', '.....kWrWk......', '....kkrrrkk.....', '...krrrrrrrk....', '...krrwrrrrk....', '...krrrrrrrk....', '....kkrrrkk.....', '.....kkkkk......'],
  daylength: [
    '................', '.....kkkkkk.....', '...kkyyyyyykk...', '..kyyyykyyyyyk..', '..kyyyykyyyyyk..', '.kyyyyykyyyyyyk.', '.kyyyyykyyyyyyk.', '.kyyyyykkkkyyyk.',
    '.kzzzzzzzzzzzzk.', '.kzzwzzzzzzwzzk.', '.kzzzzzzzzzzzzk.', '..kzzzzzwzzzzk..', '..kzzzzzzzzzzk..', '...kkzzzzzzkk...', '.....kkkkkk.....'],
  'sun-path': [
    '................', '.......YY.......', '......oYYo......', '....oo....oo....', '...o........o...', '..o...yyyy...o..', '..o..y....y..o..', '.o..y......y..o.',
    '.o..y.cccc.y..o.', '.o.y.c....c.y.o.', 'o..y.c....c.y..o', 'o..yc......cy..o', 'kkkkkkkkkkkkkkkk', 'nnnnnnnnnnnnnnnn'],
  inference: [
    '................', '................', '.kkkk...........', '.kWWk.....kkkk..', '.kkkk.b..kffffk.', '.......b.kfwffk.', '........bkffYfk.', '.........kffYfk.',
    '........b.kffk..', '.......b..kggk..', '.kkkk.b...kggk..', '.kWWk......kk...', '.kkkk...........'],
  'noon-daylength': [
    '.k..............', '.k..............', '.k....oooo......', '.k...o....o.....', '.k..o.bbbb.o....', '.k..ob....bo....', '.k.ob......bo...', '.k.ob......bo...',
    '.kob........bo..', '.kob........bo..', '.kb..........b..', '.k..............', '.kkkkkkkkkkkkkkk'],
  'solar-terms': [
    '................', '....k.....k.....', '..kkkkkkkkkkkk..', '..krrrrrrrrrrk..', '..kWWWWWWWWWWk..', '..kWWWWyyWWWWk..', '..kWWWyyyyWWWk..', '..kWWWyfyyWWWk..',
    '..kWWWWyyWWWWk..', '..kWWWWWWWWWWk..', '..kWgWgWgWgWWk..', '..kWWWWWWWWWWk..', '..kkkkkkkkkkkk..'],
  'solar-energy': [
    '..yyy...........', '.yyfyy..........', '.yyyyy.y........', '..yyy...y.......', '....y....y......', '.....y....y.....', '......y....y....', '.......y....y...',
    '........y....y..', '.........y....y.', '................', '...r..r..r..r...', '..r..r..r..r....', 'eeeeeeeeeeeeeeee', 'mmmmmmmmmmmmmmmm'],
  'ir-thermo': [
    '................', '................', '................', '...kkkkkkkk.....', '..kGGGGGGGGk....', '..kGccGGGGGkr.r.', '..kGccGGGGGk....', '..kGGGGGGGGk....',
    '...kkkGGGkkk....', '.....kGGGk......', '.....kGdGk......', '.....kGGGk......', '.....kGGGk......', '.....kkkkk......'],
  'solar-panel': [
    '...........yyy..', '..........yyfyy.', '...........yyy..', '................', '........kkkkkkk.', '.......kbcbcbck.', '......kBBBBBBk..', '.....kbcbcbck...',
    '....kbcbcbck....', '...kBBBBBBk.....', '..kbcbcbck......', '.kkkkkkkk.......', '....G...........', '...GGG..........'],
  axis: [
    '.......g...r....', '.....kkkkkkr....', '...kkbnnbbrkk...', '..kbbnnbbbrnbk..', '..kbnnnbbrbbbk..', '.kbbnnnbbrbbnbk.', '.kbbbnnbrbnnbbk.', '.kbnbbbbrbnnnbk.',
    '.kbnnbbrbbnnbbk.', '.kbbnnbrbbbnbbk.', '.kbbbnrbbbbnbbk.', '..kbbnrbbbnbbk..', '..kbbrnnbbbbbk..', '...kkrbbbbbkk...', '....rkkkkkk.....', '....r..g........'],
  'orbit-model': [
    '................', '................', '..yyy...........', '.yyfyy....kkk...', '.yyyyy.f.kbnbk..', '..yyy..f.knbbk..', '...G.....kbbnk..', '...G......kkk...',
    '...G.......m....', '..GGG.....mmm...', 'mmmmmmmmmmmmmmmm'],
  'season-reason': [
    '................', '................', '................', '....gggggggg....', '..g..........g..', '...r...yy.....r.', '.kkk..yfyy..kkk.', '.bnb..yyyy..nbb.',
    '.kkk...yy...kkk.', '.r..........r...', '..g..........g..', '....gggggggg....'],
  southern: [
    '................', '.....kkkkkk.....', '...kkBBNBBBkk...', '..kBNNBBBBBNBk..', '..kBBNBBBNNBBk..', '.kBBBBNNBBBBBBk.', '.kBNBBBBBBNBBBk.', '.krrrrrrrrrrrrk.',
    '.kcclcccccllcck.', '.kccllcccccclck.', '.kcccccllccccck.', '..kclccccclcck..', '..kccccllcccck..', '...kkcclccckk...', '.....kkkkkk.....'],
  eaves: [
    '................', '..............yy', '.............yyy', '..kkkkkkkk...f..', '.kMMMMMMMMkk.f..', 'kMMMMMMMMMMMkk..', 'kkkkkkkkkkkkkkk.', '..kWWWWWk.......',
    '..kWccWWk.f.f.f.', '..kWccWWk.......', '..kWWWWWk.......', '..kWWWWWk.......', 'mmmmmmmmmmmmmmmm'],
  counterexample: [
    '................', '.kkkkkkkkkk.....', '.kWWWWWWWWk.....', '.kWggggggWk.....', '.kWWWWWWWWk.....', '.kWgggggWWk.....', '.kWWWWWWWWk.....', '.kWggggrrWk..rr.',
    '.kWWWWWWrrk.rr..', '.kWWWWWWWrrrr...', '.kkkkkkkkkrr....', '.........rrrr...', '........rr..rr..', '.......rr....rr.'],
  sundial: [
    '................', '.....kkkkkk.....', '...kkWWkWWWkk...', '..kWWWWkWWWWWk..', '..kdWWWWWWWWWk..', '.kWWdWWGWWWWWWk.', '.kWWWdWGGWWWWWk.', '.kkWWWdGGWWWWkk.',
    '.kWWWWWGGGWWWWk.', '.kWWWWWWWWWWWWk.', '.kWWWWWWWWWWWWk.', '..kWWWWWWWWWWk..', '..kWWWWkWWWWWk..', '...kkWWWWWWkk...', '.....kkkkkk.....'],
  angbu: [
    '................', '................', '................', '..kkkkkkkkkkkk..', '.kuTTTTTTTTTTuk.', '.kuTYTYxYTYTTuk.', '..kuTYTxTYTTuk..', '...kuuuxuuuuk...',
    '....kkuuuuukk...', '.....kkkkkk.....', '.....k....k.....', '....k......k....', '...kkkkkkkkkk...'],
  jagyeokru: [
    '................', 'kkkk............', 'kbbk............', 'kkkkb...........', '....b.kkkk......', '......kbbk......', '......kkkkb.....', '..........bkkkk.',
    '...........kbbk.', '..YY.......kbbk.', '.YYYY......kbbk.', '.YYYY......kbbk.', 'YYYYYY.....kkkk.', '..kk............'],
  direction: [
    '................', '.......kk.......', '......krrk......', '......krrk......', '.....krrrrk.....', '.....krrrrk.....', '...kkkkrrkkkk...', '.kgggggkkgggggk.',
    '.kgggggkkgggggk.', '...kkkkWWkkkk...', '.....kWWWWk.....', '.....kWWWWk.....', '......kWWk......', '......kWWk......', '.......kk.......'],
  'white-night': [
    'zzzzzzzzzzzzzzzz', 'zzwzzzzzzzzzwzzz', 'zzzzzzzzwzzzzzzz', 'zzzzzwzzzzzzzzzz', 'zzzzzzzzzzzzzwzz', 'zwzzzzzzzzzzzzzz', 'zzzzzzzzzzwzzzzz', 'zzzzzzzzzzzzzzzz',
    'zzzzzzzyyzzzzzzz', 'zzzzzzyfyyzzzzzz', 'zzrzzzyyyyzzzzzz', 'NrRrNNNNNNNNNNNN', 'NNNNNNNNNNNNNNNN', 'NNNNNNNNNNNNNNNN'],
  'polar-night': [
    'zzzzzzzzzzzzzzzz', 'zwzzzzzzzzzzzzzz', 'zzzzzzwzzzCCzzzz', 'zzzzzzzzzCCzzzzz', 'zzwzzzzzzCCzzwzz', 'zzzzzzzzzzCCzzzz', 'zzzzzwzzzzzzzzzz', 'zzzzzzzzzzzzzzzz',
    'zwzzzzzzzwzzzzwz', 'zzzzzzzzzzzzzzzz', 'qqqqqqqqqqqqqqqq', 'WWWWWWWWWWWWWWWW', 'CCCCCCCCCCCCCCCC', 'WWWWWWWWWWWWWWWW'],
  'mind-map': [
    '................', '.kkk........kkk.', '.kbk........knk.', '.kkkg......gkkk.', '.....g....g.....', '......kkkk......', '.....kyyyyk.....', '.....kyfyyk.....',
    '.....kyyyyk.....', '......kkkk......', '.....g....g.....', '....g......g....', '.kkk........kkk.', '.krk........kok.', '.kkk........kkk.'],

  // ---------------------------------------------------------------- 불꽃 에너지 지구
  candle: [
    '................', '.......oo.......', '......oyyo......', '......offo......', '.......yy.......', '.......k........', '.....kkkkkk.....', '.....kwWWWk.....',
    '.....kwWWWk.....', '.....kwWWWk.....', '.....kwWWWk.....', '.....kwWWWk.....', '.....kwWWWk.....', '...kkkkkkkkkk...', '...mmmmmmmmmm...'],
  'wax-drip': [
    '................', '.......oo.......', '......oyyo......', '.......yy.......', '.......k........', '.....kkkkkk.....', '....WkwWWWkW....', '....WkwWWWkW....',
    '....WkwWWWkW....', '.....kwWWWkW....', '.....kwWWWkW....', '.....kwWWWk.....', '.....kwWWWk.....', '..WWWWWWWWWWWW..', '...kkkkkkkkkk...'],
  'fire-safety': [
    '................', '......kk........', '.....kggkkk.....', '......kk..k.....', '.....kkkk..k....', '....krrrrk..k...', '....krwrrk...k..', '....krwrrk...kk.',
    '....krrrrk......', '....kWWWWk......', '....kWrrWk......', '....kWWWWk......', '....krrrrk......', '....krrrrk......', '.....kkkk.......'],
  property: [
    '................', '................', '................', '.kkkkkk..kkkkkk.', '.kggggk..kggggk.', '.kkkkkk..kkkkkk.', '.kCCCCk..kCCCCk.', '.kwWwWk..ktmtmk.',
    '.kWwWwk..kmtmtk.', '.kwWwWk..ktmtmk.', '.kWwWwk..kmtmtk.', '.kkkkkk..kkkkkk.'],
  magnifier: [
    '................', '...kkkkk........', '..kCCCCCk.......', '.kCwwCCCCk......', '.kCwCCCCCk......', '.kCCCtCCCk......', '.kCCtttCCk......', '.kCCCtCCCk......',
    '..kCCCCCk.......', '...kkkkkmm......', '.........mmm....', '..........mmm...', '...........mmm..', '............mm..'],
  'mix-same': [
    '................', '................', '................', '................', '......wx........', '.....wxww.......', '....xwwxwx......', '...wwxwwxwwx....',
    '.kkkkkkkkkkkkkk.', '.kbbbbbbbbbbbbk.', '..kbbbbbbbbbbk..', '...kbbbbbbbbk...', '....kkkkkkkk....'],
  'mix-new': [
    '................', '.............y..', '..kkkkkkkkkkyyy.', '...k......k..y..', '...k......k.....', '...kCCCCCCk.....', '...kCCwwCCk.....', '...kCwwwwCk.....',
    '...kCCwwCCk.....', '...kCCCCwCk.....', '...kCwCCCCk.....', '...kCCCCCCk.....', '...kkkkkkkk.....'],
  'smell-safety': [
    '................', '..........s.s...', '.........ssss.s.', '.........sssss..', '........sssss...', '.........sss....', '..g.g.g.........', '.g.g.g.g........',
    '....kkkk........', '....kCCk........', '...kCaaCk.......', '..kCaaaaCk......', '..kaaaaaak......', '..kkkkkkkk......'],
  gansu: [
    '................', '.......c........', '......ccc.......', '.....ccwcc......', '.....ccccc......', '......ccc.......', '................', '..kkkkkkkkkkkk..',
    '..kWWWWWWWWWWk..', '..kWwwwwwwwwWk..', '..kWWWWWWWWWWk..', '..kgWWWWWWWWgk..', '..kggggggggggk..', '..kkkkkkkkkkkk..'],
  'alcohol-lamp': [
    '................', '.......c........', '......cbc.......', '......cbc.......', '.......k........', '......kkk.......', '.....kgggk......', '....kCCCCCk.....',
    '...kCCCCCCCk....', '..kCwCCCCCCCk...', '..kccccccccck...', '..kccccccccck...', '...kccccccck....', '....kkkkkkk.....'],
  'light-heat': [
    '................', '..y.........y...', '...y...o...y....', '......ooo.......', '......oyo.......', '.....oyyoo......', 'yy...oyfyo...yy.', '....oyyffyo.....',
    '....oyfffyo.....', '....ryyfyyr.....', '..r..ryyyr..r...', '.r....rrr..r....', '..r.........r...'],
  fuel: [
    '.......o........', '......oyo.......', '.......y........', '......kkk.......', '.....kTmTk......', '.....kmTmk......', '.....kTmTk......', '......kkk.......',
    '...kkk....kkk...', '..kTmTk..kTmTk..', '..kmTmk..kmTmk..', '..kTmTk..kTmTk..', '...kkk....kkk...'],
  wick: [
    '................', '.......o........', '......oyo.......', '......yfy.......', '......bkb.......', '......bkb.......', '..kkkkkkkkkkk...', '..kTTTTkTTTTk...',
    '..kWWWWkWWWWk...', '..kWWWWkWWWWk...', '..kWWWWkWWWWk...', '..kWWWWWWWWWk...', '..kWWWWWWWWWk...', '..kkkkkkkkkkk...'],
  'forest-road': [
    '.nn..TTTT...nn..', 'nnnn.TTTT..nnnn.', 'nNnn.TTTT..nNnn.', '.mm..TTTT...mm..', '.nn..TTTT...nn..', 'nnnn.TTTT..nnnn.', 'nnNn.TTTT..nnNn.', '.mm..TTTT...mm..',
    '.nn..TTTT...nn..', 'nnnn.TTTT..nnnn.', 'nNnn.TTTT..nNnn.', '.mm..TTTT...mm..', '.....TTTT.......'],
  oxygen: [
    '................', '................', '................', '................', '..kkkk....kkkk..', '.krrrrk..krrrrk.', '.krwrrkggkrwrrk.', '.krrrrkggkrrrrk.',
    '.krrrrk..krrrrk.', '..kkkk....kkkk..'],
  'gas-jar': [
    '................', '..kkkkkkkkkkk...', '..kCCCCCCCCCk...', '..kCwCCCCCCCk...', '..kCwCCoCCCCk...', '..kCCCoyoCCCk...', '..kCCCCyCCCCk...', '..kCCCCkCCCCk...',
    '..kCCCkWkCCCk...', '..kCCCkWkCCCk...', '..kCCCkWkCCCk...', '.kkkkkkkkkkkkk..', 'mmmmmmmmmmmmmmm.'],
  'air-hole': [
    '................', '................', '.....o....o.....', '....oyo..oyo....', '..kkkkkkkkkkkk..', '..krdrddrdrrdk..', '...kGGGGGGGGk...', '...kGGGGGGGGk...',
    'bbbkGxGxGxGxk...', '....kGGGGGGk....', '....k......k....', '...k........k...'],
  rocket: [
    '.......kk.......', '......kWWk......', '......kWWk......', '.....kWbbWk.....', '.....kWbbWk.....', '.....kWWWWk.....', '.....kWWWWk.....', '.....kWrrWk.....',
    '....kkWWWWkk....', '...krkWWWWkrk...', '...krkkkkkkrk...', '...kk.kggk.kk...', '......oyyo......', '......oyyo......', '.......oo.......'],
  'o2-tube': [
    '................', '................', '................', '................', '...........kkkk.', '...........kGGk.', '.kkkkkkkkkkkGGk.', 'kVVVVVWWWWWkGGkk', 'kVVVVVWWWWWkGGkm', '.kkkkkkkkkkkGGk.', '.k.k.k.k.k.kGGk.', '...........kkkk.'],
  'ignition-point': [
    '................', '..kkk...........', '..kWk......o....', '..kWk.....oyo...', '..krk.....oyo...', '..krk....oyfyo..', '..krk....oyffyo.', '..krk....oyffyo.',
    '.krrrk....oyyo..', '.krrrk...mmmmmm.', '..kkk...kkkkkkkk', '........rrrrrrrr', '........dddddddd'],
  match: [
    '...........oo...', '..........oyyo..', '..........oyfo..', '..........krrk..', '..........krrk..', '.........kmk....', '........kmk.....', '.......kmk......',
    '......kmk.......', '.....kmk........', '....kmk.........', '...kmk..........', '..kmk...........', '..kk............'],
  combustion: [
    '................', '.......o........', '......oyo.......', '.....oyyo.o.....', '....oyyfyoyo....', '....oyffyyyo....', '...oyfffffyo....', '...oyffwffyo....',
    '....oyfffyo.....', '....rooyoor.....', '..mm.rrrrr.mm...', '...mmm...mmm....', '.....mmmmm......', '...mmm...mmm....', '..mm.......mm...'],
  'fire-triangle': [
    '................', '.......kk.......', '......krrk......', '......krrk......', '.....krrrrk.....', '.....krrrrk.....', '....k......k....', '....k......k....',
    '...kmm....bbk...', '...kmm....bbk...', '..kmmm....bbbk..', '..kmmm....bbbk..', '.kkkkkkkkkkkkkk.'],
  'cobalt-paper': [
    '................', '..........c.....', '.........ccc....', '.........cwc....', '..........c.....', '................', '..kkkkkkkkkkkk..', '..kbbbbbpppppk..',
    '..kbbbbbpppppk..', '..kbbbbbpppppk..', '..kkkkkkkkkkkk..'],
  vapor: [
    '................', 'CCCCCCCCCCCCCCCC', 'kkkkkkkkkkkkkkkk', '.c..c...c...c..c', '.c......c.......', '...g...g...g....', '..g...g...g.....', '...g...g...g....',
    '..g...g...g.....', '................', '.......o........', '......oyo.......', '......kkk.......', '.....kWWWk......', '.....kWWWk......'],
  limewater: [
    '................', 'kkkkkk....kkkkkk', '.kCCk......kCCk.', '.kCCk......kCCk.', '.kCCk......kCwk.', '.kCCk....b.kWWk.', '.kCCk.bbbb.kWgk.', '.kCCk....b.kWWk.',
    '.kCCk......kgWk.', '.kCCk......kWWk.', '.kCCk......kWWk.', '..kk........kk..'],
  co2: [
    '................', '................', '................', '................', '................', '......kkkk......', '.kkk.kddddk.kkk.', 'krwrkkdgddkkrwrk',
    'krrrkkddddkkrrrk', '.kkk.kddddk.kkk.', '......kkkk......'],
  'thermal-plant': [
    '...gg...........', '..gggg..........', '...ggg..........', '..kkkk..........', '..krrk..........', '..kWWk.....yy...', '..krrk....yy....', '..kWWk...yyyy...',
    'kkkkkkkkk..yy...', 'kGGGGGGGk.yy....', 'kGcGcGcGk.y.....', 'kGGGGGGGk.......', 'kGcGcGcGk.......', 'kkkkkkkkk.......'],
  'korean-fir': [
    '.......N........', '......NNN.......', '.....NNvNN......', '......NNN.......', '.....NNnNN......', '....NNNNNvN.....', '.....NNNNN......', '....NNvNNNNN....',
    '...NNNNNnNNNN...', '.....NNNNNN.....', '...NNNNNNvNNN...', '..NNNnNNNNNNNN..', '.......mm.......', '.......mm.......', 'WWWWWWWWWWWWWWWW'],
  'sea-turtle': [
    '................', '.......tt.......', '......tttt......', '.tt...kkkk...tt.', 'ttt.kkuuuukk.ttt', '.ttkuuMuuMuuktt.', '...kuMuuuuMuk...', '...kuuuMMuuuk...',
    '...kuMuuuuMuk...', '..tkuuMuuMuukt..', '.tt.kkuuuukk.tt.', '......kkkk......', '.......tt.......'],
  source: [
    '................', '..kkkkkkkk......', '..kWWWWWWkk.....', '..kWggggWkWk....', '..kWWWWWWkkkk...', '..kWggggggWk....', '..kWWWWWWWWk....', '..kWggggggWk....',
    '..kWWWWWWWWk....', '..kWgggWWWWk....', '..kWWWWWkkkkk...', '..kWWWWWkrrrrk..', '..kWWWWWkrwrrk..', '..kkkkkkkkkkkk..'],
  bellows: [
    '................', '................', '................', '.kkkkkkkk.......', 'kmmmmmmmmkk.....', '.kttttttttkk....', '..kMtMtMtMtkkkkk', '..kMtMtMtMtk..g.',
    '.kttttttttkk..g.', 'kmmmmmmmmkk.....', '.kkkkkkkk.......'],
  'blast-furnace': [
    '................', '......kkkk......', '.....kddddk.....', '.....kdGGdk.....', '....kddGGddk....', '....kdGGGGdk....', '...kddGGGGddk...', '...kdGGrrGGdk...',
    '...kdGroorGdk...', '...kdGGrrGGdkk..', '...kddGGGGddkoo.', '...kddddddddk.o.', '..kkkkkkkkkkkkyo'],

  // ---------------------------------------------------------------- 전력망 지구
  led: [
    '................', '......kkkk......', '..y..krrrrk..y..', '.....krwrrk.....', '.y...krwrrk...y.', '.....krrrrk.....', '....kkkkkkkk....', '......g..g......',
    '......g..g......', '......g..g......', '......g..g......', '......g..g......', '......g.........', '......g.........'],
  'coin-cell': [
    '................', '................', '................', '.....kkkkkk.....', '...kkggggggkk...', '..kgwggggggggk..', '.kgggggGggggggk.', '.kggggGGGgggggk.',
    '.kgggggGggggggk.', '.kggggggggggggk.', '..kggggggggggk..', '...kkGGGGGGkk...', '.....kkkkkk.....'],
  'light-signal': [
    '................', '......kkk.......', 'yy...kyyyk...yy.', '..yy.kyfyk.yy...', '.....kkkkk......', '......kWk.......', '......krk.......', '.....kWWWk......',
    '.....krrrk......', '.....kWWWk......', '....krrrrrk.....', '....kWWWWWk.....', '...kkkkkkkkk....', 'bbbbbbbbbbbbbbbb'],
  battery: [
    '................', '.......kk.......', '......kggk......', '.....kkkkkk..r..', '.....kYYYYk.rrr.', '.....kYwYYk..r..', '.....kYYYYk.....', '.....kddddk.....',
    '.....kdwddk.....', '.....kddddk.....', '.....kddddk.....', '.....kddddk.bbb.', '.....kGGGGk.....', '.....kkkkkk.....'],
  bulb: [
    '................', '.....kkkkk......', '....kCCCCCk.....', '...kCwCCCCCk....', '...kCwCyCyCk....', '...kCCCCyCCk....', '...kCCCgCgCk....', '....kCCgCgk.....',
    '.....kCCCk......', '.....kgggk......', '.....kGGGk......', '.....kgggk......', '.....kGGGk......', '......kdk.......', '.......k........'],
  circuit: [
    '....y......y....', '......kkkk......', '.....kyyyyk.....', '.....kyffyk.....', '.rrrrrkggkrrrrr.', '.r............r.', '.r............r.', '.r............r.',
    '.r............r.', '.r............r.', '.r...kkkkkk...r.', '.rrrrkddYYkrrrr.', '.....kkkkkk.....'],
  switch: [
    '................', '................', '................', '...........rr...', '..........rrk...', '.........gk.....', '........gk......', '.......gk.......',
    '......gk........', '.....gk.........', '..kkgk......kk..', '.kGGGGGGGGGGGGk.', '.kmmmmmmmmmmmmk.', '.kkkkkkkkkkkkkk.'],
  holder: [
    '................', '................', '................', '................', '................', 'kkkkkkkkkkkkkkkk', 'kgkYYYdddddddkgk', 'kgkYwYdddddddkgk',
    'kgkYYYdddddddkgk', 'kkkkkkkkkkkkkkkk', '.r............x.', '.r............x.', '..r..........x..', '...rr......xx...'],
  conductor: [
    '................', '................', '................', '............y...', '..yyyyyyyyyyyy..', '............y...', '................', '.kkkkkkkkkkkkkk.',
    'kTTTTTTTTTTTTTTk', 'kuuuuuuuuuuuuuuk', 'kuuuuuuuuuuuuuuk', 'kMMMMMMMMMMMMMMk', '.kkkkkkkkkkkkkk.'],
  insulator: [
    '................', '................', '.......r...r....', '.....y..r.r.....', 'yyyyyy...r......', '.....y..r.r.....', '.......r...r....', '................',
    '.kkkkkkkkkkkkkk.', 'kmmMmmmmMmmmmMmk', 'kMmmmmMmmmmMmmmk', '.kkkkkkkkkkkkkk.'],
  series: [
    '....y.....y.....', '......kkkk......', '.....kyyyyk.....', '..y..kyffyk..y..', '......kggk......', '.rrrrrr..rrrrrr.', '.r............r.', '.r............r.',
    '.r............r.', '.rkkkkkkkkkkkkr.', '.rkdddYkkdddYkr.', '.rkdddYkkdddYkr.', '..kkkkkkkkkkkk..'],
  motor: [
    '................', '................', '................', '..kkkkkkkk......', '.kGGGGGGGGk..y..', '.kgggggggGk...y.', '.kGGGGGGGGkgggg.', '.kGGGGGGGGkkkkk.',
    '.kgggggggGk...y.', '.kGGGGGGGGk..yy.', '..kkkkkkkk......', '..r......b......', '..r......b......'],
  buzzer: [
    '................', '................', '................', '................', '...kkkkk........', '..kdddddk...c...', '.kdddddddk...c..', '.kddGGGddk.c..c.',
    '.kddGkGddk.c..c.', '.kddGGGddk.c..c.', '.kdddddddk...c..', '..kdddddk...c...', '...kkkkk........', '....r.b.........'],
  electromagnet: [
    '................', '................', '................', '................', 'kkk.............', 'kGk.uMuMuMuM....', 'kGkGuMuMuMuMGGk.', 'kGkGuMuMuMuMGGk.',
    'kGkGuMuMuMuMGGk.', 'kGkGuMuMuMuMGGk.', 'kGk.uMuMuMuM.g..', 'kkk.r.......ggg.', '....r.......g.g.', '....rrrr....ggg.'],
  'enamel-wire': [
    '................', '.....kkkkkk...YY', '...kkuuuuuukku..', '..kuuMMMMMMuuk..', '..kuMuuuuuuMuk..', '.kuMuMMMMMMuMuk.', '.kuMuMddddMuMuk.', '.kuMuMdkkdMuMuk.',
    '.kuMuMdkkdMuMuk.', '.kuMuMddddMuMuk.', '.kuMuMMMMMMuMuk.', '..kuMuuuuuuMuk..', '..kuuMMMMMMuuk..', '...kkuuuuuukk...', '.....kkkkkk.....'],
  compass: [
    '................', '.....kkkkkk.....', '...kkWWWWWWkk...', '..kWWWWrrWWWWk..', '..kWWWWrrWWWWk..', '.kWWWWWrrWWWWWk.', '.kWWWWrrrrWWWWk.', '.kgWWWrkkrWWWgk.',
    '.kgWWWGkkGWWWgk.', '.kWWWWGGGGWWWWk.', '.kWWWWWGGWWWWWk.', '..kWWWWGGWWWWk..', '..kWWWWGGWWWWk..', '...kkWWWWWWkk...', '.....kkkkkk.....'],
  crane: [
    '................', 'kkkkkkkkkkkkk...', 'kYkYkYkYkYkYk...', 'kkkkkkkkkkkkk...', 'kYk........g....', 'kYk........g....', 'kYk........g....', 'kYk.......kkk...',
    'kYk......kdddk..', 'kYk......kdddk..', 'kYk......kkkkk..', 'kYk.....GGGGGGG.', 'kYk.....GgGgGgG.', 'kkkk............'],
  'permanent-magnet': [
    '................', '................', '.kkkk....kkkk...', '.kggk....kggk...', '.kggk....kggk...', '.krrk....kbbk...', '.krrk....kbbk...', '.krrk....kbbk...',
    '.krrk....kbbk...', '.krrrk..kbbbk...', '..krrrkkbbbk....', '...krrrbbbk.....', '....kkkkkk......'],
  speaker: [
    '................', '................', '........k.......', '.......kdk......', '......kddk...c..', '..kkkkdddk..c...', '..kGGkdddk.c..c.', '..kGGkdddk.c..c.',
    '..kGGkdddk.c..c.', '..kGGkdddk.c..c.', '..kkkkdddk..c...', '......kddk...c..', '.......kdk......', '........k.......'],
  maglev: [
    '................', '................', '................', '................', '....kkkkkkkkkk..', '..kkWWWWWWWWWWk.', '.kcWbbWbbWbbWWk.', 'kcWWWWWWWWWWWWk.',
    'kWWWrrrrrrrrrrk.', '.kkkkkkkkkkkkkk.', '................', '.y.y.y.y.y.y.y..', 'GGGGGGGGGGGGGGGG', 'dddddddddddddddd'],
  efficiency: [
    '................', '..kkkkk.........', '.kfffffk..nnn...', '.kfwfffk..nnn...', '.kfffffk..nnn...', '.kfffffk..nnn...', '..kfffk.nnnnnnn.', '...kgk...nnnnn..',
    '...kgk....nnn...', '....k......n....'],
  'energy-label': [
    '................', '.kkkkkkkkkkkkkk.', '.kWWWWWWWWWWWWk.', '.kWnnnWWWWWWWWk.', '.kWllllWWWWWWWk.', '.kWjjjjjWWWWWWk.', '.kWyyyyyyWWWWWk.', '.kWoooooooWWWWk.',
    '.kWrrrrrrrrWWWk.', '.kWWWWWWWWWWWWk.', '.kWgggggggggWWk.', '.kWWWWWWWWWWWWk.', '.kkkkkkkkkkkkkk.'],
  'wet-safety': [
    '................', '................', '................', '................', '..c.......kkkkkk', '.ccc...y..kWWWWk', '.ccc..yy..kdWWdk', '..c..yyyy.kdWWdk',
    '........yykWWWWk', '.......y..kkkkkk', '.c..............', 'ccc.............', 'ccc.............', '.c..............'],
  'power-saving': [
    '................', '.......nn.......', '....n..nn..n....', '...nn..nn..nn...', '..nn...nn...nn..', '.nn....nn....nn.', '.nn....nn....nn.', '.nn..........nn.',
    '.nn..........nn.', '.nn..........nn.', '..nn........nn..', '...nnn....nnn...', '.....nnnnnn.....'],
  'plug-safety': [
    '....r.....r.....', '...r.....r......', '....r.....r.....', '..d....d....d...', '..d....d....d...', '.kWk..kWk..kWk..', '.kWk..kWk..kWk..', 'kkkkkkkkkkkkkkkk',
    'kWdWdWdWdWdWdWWk', 'kWWWWWWWWWWWWWrk', 'kkkkkkkkkkkkkkkk'],
  'action-plan': [
    '................', '....kkkkkk......', '..kkkggggkkk....', '..kWWkkkkWWk....', '..kWWWWWWWWk....', '..kWnWggggWk....', '..kWWWWWWWWk....', '..kWnWggggWk....',
    '..kWWWWWWWWk....', '..kWWWggggWk....', '..kWWWWWWWWk....', '..kkkkkkkkkk....'],
  notice: [
    '................', '.kkkkkkkkkkkkkk.', '.kYYYYYYYYYYYYk.', '.kYWWWWWWWWWWYk.', '.kYWrrWggggWWYk.', '.kYWrrWWWWWWWYk.', '.kYWWWWggggWWYk.', '.kYWWWWWWWWWWYk.',
    '.kYWggggggWWWYk.', '.kYYYYYYYYYYYYk.', '.kkkkkkkkkkkkkk.', '.......mm.......', '.......mm.......', '.....mmmmmm.....'],
  breaker: [
    '................', '.kkkkkkkkkkkkkk.', '.kGGGGGGGGGGGGk.', '.kGGGGGGGGGGGGk.', '.kGkkGkkGkkGkkk.', '.kGWWGWWGkkGWWk.', '.kGWWGWWGrrGWWk.', '.kGkkGkkGrrGkkk.',
    '.kGkkGkkGkkGkkk.', '.kGGGGGGGGGGGGk.', '.kGGGGGGGGGGGGk.', '.kkkkkkkkkkkkkk.'],
  'smart-grid': [
    '................', '..r.........bb..', '.rrr.......bccb.', '.kWk.......kbbk.', '.kkk.y...y.kkkk.', '......y.y.......', '......kkkk......', '.yyyyykbbkyyyyy.',
    '.....ykbbky.....', '......kkkk......', '......y..y......', '.kkk.y....y.kkk.', '.kdk........kYk.', '.kdk........kYk.', '.kkk........kkk.'],
  'fact-guess': [
    '................', '.........kkkkk..', '........kWWWWWk.', '.kkkkk..kWbbbWk.', 'kWWbWWk.kWWWbWk.', 'kWbxbWk.kWWbbWk.', 'kWWbWWk.kWWbWWk.', '.kkkkk..kWWWWWk.',
    '........kWWbWWk.', '.........kkkkk..', '.......kk.......', '......k.........'],

  // ---------------------------------------------------------------- 미래 연구 본부
  'drone-pilot': [
    'ggg........ggg..', '.k..........k...', '..k........k....', '...k......k.....', '....kkkkkk......', '....kdrrdk......', '....kddddk......', '....kkkkkk......',
    '...k...g..k.....', '..k...kkk..k....', '.k....kmk...k...', 'ggg...kkk..ggg..'],
  'job-change': [
    '................', '................', '................', '................', '..kkk...........', '.kmkmk....gg..gg', 'kmMkMmk..y.k..k.', 'kkkMkkkyyy..kk..',
    'kmMkMmk..y.k..k.', '.kmkmk....gg..gg', '..kkk...........'],
  statistics: [
    '................', '................', '..kkkkkkkkkkk...', '..kWWWWWWWWWk...', '..kWWWWWWrrWk...', '..kWWWWWWrrWk...', '..kWWWbbWrrWk...', '..kWWWbbWrrWk...',
    '..kWWWbbWrrWk...', '..knnWbbWrrWk...', '..knnWbbWrrWk...', '..knnWbbWrrWk...', '..kkkkkkkkkkk...'],
  digital: [
    '................', '................', '................', '.........kkkkkkk', 'kkkkkk...kcbcbck', 'kWWWWk...kccccck', 'kWggWk.y.kcbbcck', 'kWWWWkyyykccccck',
    'kWggWk.y.kcbccck', 'kWWWWk...kccccck', 'kkkkkk...kccccck', '.........kkkgkkk'],
  'four-fields': [
    'kkkkkkk..kkkkkkk', 'kbbbbbk..kvvvvvk', 'kbwbwbk..kvCCCvk', 'kbbwbbk..kvCCCvk', 'kbwbwbk..kvvkvvk', 'kbbbbbk..kvkkkvk', 'kkkkkkk..kkkkkkk', '................',
    'kkkkkkk..kkkkkkk', 'koosook..knnnlnk', 'kosssok..knnllnk', 'koosook..knllnnk', 'kososok..knnlnnk', 'koooook..knnnnnk', 'kkkkkkk..kkkkkkk'],
  trend: [
    '.k..............', '.k..........rrr.', '.k...........rr.', '.k..........r.r.', '.k.........r....', '.k........r.....', '.k.......r......', '.k......r.......',
    '.k.....r........', '.k....r.........', '.k...r..........', '.k..r...........', '.kkkkkkkkkkkkkkk'],
  'extreme-weather': [
    '...........yyy..', '....dddd..yyyyy.', '..ddGGGGddyyyyy.', '.dGGGGGGGGdyyy..', 'dGGgGGGGGGGd....', 'dGGGGGGGGGGd....', '.dddddddddd.....', '..c..yy..c......',
    '.c..yy..c..c....', '...yyyy...c.....', '.c...yy.c..c....', '....yy..c.......', '..c.y..c........'],
  aging: [
    '................', '..bbbbbbpppppp..', '................', '...bbbbbppppp...', '................', '....bbbbpppp....', '................', '.....bbbppp.....', '................', '......bbpp......', '................', '.......bp.......'],
  'white-hacker': [
    '................', '..kkkkkkkkkkkk..', '..kbbbbbbbbbbk..', '..kbbbbbbbbbbk..', '..kbbbkkkkbbbk..', '..kbbkWWWWkbbk..', '..kbbkWWWWkbbk..', '..kbkWWWWWWkbk..',
    '..kbbkkkkkkbbk..', '...kbbbbbbbbk...', '...kbbbbbbbbk...', '....kbbbbbbk....', '.....kbbbbk.....', '......kkkk......'],
  biometrics: [
    '................', '.....bbbbbb.....', '...bb......bb...', '..b..bbbbbb..b..', '.b..b......b..b.', '.b.b..bbbb..b.b.', 'b..b.b....b.b..b', 'b.b.b.b..b.b.b.b',
    'b.b.b.b..b.b.b.b', 'b.b.b..bb..b.b..', '.b.b.b....b.b...', '.b..b.bbbb..b...', '..b..b....b.....', '...b..bbbb......'],
  encryption: [
    '................', '.....kkkkk......', '....kgggggk.....', '...kgk...kgk....', '...kgk...kgk....', '...kgk...kgk....', '..kkkkkkkkkkk...', '..kYYYYYYYYYk...',
    '..kYYYYkYYYYk...', '..kYYYkkkYYYk...', '..kYYYYkYYYYk...', '..kYYYYkYYYYk...', '..kYYYYYYYYYk...', '..kkkkkkkkkkk...'],
  'smart-sensor': [
    '.....kkkkk......', '.....kdddk......', '.....kdddk......', '...kkkkkkkkk....', '...kzzzzzzzk....', '...kzrzrzzzk....', '...kzrrrzzzk....', '...kzzrzzzzk....',
    '...kzzzznzzk....', '...knnnnnnnk....', '...kzzzzzzzk....', '...kkkkkkkkk....', '.....kdddk......', '.....kdddk......', '.....kkkkk......'],
  renewable: [
    '......w.........', '......w...yyy...', '......w..yyyyy..', '......w...yyy...', '......w.........', '......k.........', '.....wgw........', '....w.g.w.......',
    '...w..g..w......', '..w...g...w.....', '......g.........', '......g...kkkkk.', '......g...kbcbk.', '.....ggg..kkkkk.', 'nnnnnnnnnnnnnnnn'],
  limits: [
    '................', '................', '................', '.....kkkkkk.....', '...kknnyyrrkk...', '..knnnnyyrrrrk..', '.knnnWWkWWWrrrk.', '.knnWWWkWWWWrrk.',
    '.knWWWWkWWWWWrk.', '.knWWWkkkWWWWrk.', '.kkkkkkkkkkkkkk.', '................', '..s.........s...', '.sss.......sss..', '.s.s.......s.s..'],
  biofuel: [
    '.......Y........', '......YYY.......', '......YyY.......', '.......Y........', '......kkk.......', '......kCk.......', '.....kCCCk......', '....kCCCCCk.....',
    '...klllllllk....', '..klNllNllNlk...', '..kllNllNllNk...', '..klNllNllNlk...', '...kkkkkkkkk....'],
  ai: [
    '................', '....g.g.g.g.....', '....g.g.g.g.....', '...kkkkkkkkkk...', '...kddddddddk...', '.ggkdccccccdkgg.', '...kdcbccbcdk...', '.ggkdcccbccdkgg.',
    '...kdcbcccbdk...', '.ggkdccbcccdkgg.', '...kdccccccdk...', '.ggkddddddddkgg.', '...kkkkkkkkkk...', '....g.g.g.g.....', '....g.g.g.g.....'],
  'card-news': [
    '................', '....kkkkkkkkkkk.', '....kWWWWWWWWWk.', '.kkkkkkkkkkkWWk.', '.kccccccyyckWWk.', '.kccccccyyckWWk.', '.kcnnnccccckWWk.', '.knnnnnnnnnkWWk.',
    '.kWWWWWWWWWkWWk.', '.kWgggggggWkWWk.', '.kWWWWWWWWWkWWk.', '.kWgggggWWWkkkk.', '.kWWWWWWWWWk....', '.kkkkkkkkkkk....', '....r.g.g.......'],
  'sci-elements': [
    '......kkkk......', '.....kbbbbk.....', '.....kbwbbk.....', '.....kbbbbk.....', '.....kbbbbk.....', '......kkkk......', '.....g....g.....', '....g......g....',
    '...g........g...', '.kkkk......kkkk.', 'knnnnk....krrrrk', 'knwnnk....krwrrk', 'knnnnkggggkrrrrk', 'knnnnk....krrrrk', '.kkkk......kkkk.'],
  career: [
    '................', '......mm........', '...kkkkkkkkk....', '...kYYYYYYYYYk..', '...kkkkkkkkk....', '......mm........', '....kkkkkkkkk...', '..kbbbbbbbbbk...',
    '....kkkkkkkkk...', '......mm........', '......mm........', '......mm........', '..nnnnmmnnnnnn..', 'nnnnnnnnnnnnnnnn'],
  webtoon: [
    '................', '................', '.kkkkkkkkkkkk...', '.kcccccWppppk...', '.kcssccWppppk...', '.kcssccWppppk...', '.kcccccWppypk..d', '.kcccccWppppk.d.',
    '.kWWWWWWWWWWkd..', '.kllllllllllkd..', '.klllllllnllk...', '.kllllllllllk...', '.kkkkkkkkkkkk...'],
  'climate-expert': [
    '................', '............kk..', '...........kWWk.', '....kkkk...kWWk.', '..kkbbnbkk.kWWk.', '.kbbnnbbbbkkrWk.', '.kbnnnbbnbkkrWk.', 'kbbbnbbnnbbkrWk.',
    'kbbbbbbbnbbkrWk.', '.kbnbbbbbbkkrWk.', '.kbbnnbbbbkkrWk.', '..kkbbbbkk.krrrk', '....kkkk...krrrk', '............kkk.'],
  'name-card': [
    '................', '................', '................', '.kkkkkkkkkkkkkk.', '.kWWWWWWWWWWWWk.', '.kWkkkWWggggWWk.', '.kWkskWWWWWWWWk.', '.kWkskWWgggggWk.',
    '.kWkkkWWWWWWWWk.', '.kWWWWWWggggWWk.', '.kWWWWWWWWWWWWk.', '.kbbbbbbbbbbbbk.', '.kkkkkkkkkkkkkk.'],
  privacy: [
    '................', '................', '................', 'kkkkkkkkkk......', 'kWWWWWWWWk.kkkk.', 'kWkkkWggWk.k..k.', 'kWkskWWWWk.k..k.', 'kWkskWgggkkkkkkk',
    'kWkkkWWWWkkYYYYk', 'kWggggWWWkkYkYYk', 'kWWWWWWWWkkYkYYk', 'kkkkkkkkkkkYYYYk', '..........kkkkkk'],
  'citizen-science': [
    '................', '....kkkkkkkk....', '....kccccyck....', '....kcnnnnck....', '....knnnnnnk....', '....kkkkkkkk....', '...g...gg...g...', '.ss....ss....ss.',
    '.ss....ss....ss.', 'bbbb..rrrr..nnnn', 'bbbb..rrrr..nnnn', 'bbbb..rrrr..nnnn'],
  'biased-data': [
    '................', '..kkkkk.........', '..kyyyk.........', '..kyfyk.........', '..kyyyk.........', '..kyyyk.........', '..kyyyk.........', '..kyyyk.........',
    '..kyyyk.........', '..kyyyk..kkkkk..', '..kyyyk..kzzzk..', '..kyyyk..kzwzk..', '..kyyyk..kzzzk..', 'kkkkkkkkkkkkkkkk'],
  evidence: [
    '................', '....kkkkk.......', '...kCCCCCk......', '..kCCdCdCCk.....', '..kCCdddCCk.....', '..kCCdddCCk.....', '..kCCCddCCk.....', '..kCCCddCCk.....',
    '...kCCCCCk......', '....kkkkkmm.....', '.........mmm....', '..........mmm...', '...........mmm..', '............mm..'],
  'future-me': [
    '.......YY.......', '......YYYY......', '......YYYY......', '.....YYYYYY.....', 'YYYYYYYYYYYYYYYY', '.YYYYYYYYYYYYYY.', '..YYYYkYYkYYYY..', '...YYYYYYYYYY...',
    '....YYkYYkYY....', '....YYYkkYYY....', '...YYYYYYYYYY...', '...YYYYYYYYYY...', '..YYYY....YYYY..', '..YYY......YYY..', '.YY..........YY.'],
  // ---------------------------------------------------------------- 푸른 생활 지구 (우리 몸)
  skeleton: [
    '......kkkk......', '.....kWWWWk.....', '....kWkWWkWk....', '....kWWWWWWk....', '.....kWkkWk.....', '......kWWk......', '....kkkWWkkk....', '...kWWWWWWWWk...',
    '...kWkkWWkkWk...', '...kWWWWWWWWk...', '...kWkkWWkkWk...', '....kkkWWkkk....', '.......WW.......', '.....kWWWWk.....', '....kWk..kWk....', '....kWk..kWk....'],
  'bone-muscle': [
    '................', '..kk............', '.kWWk...........', '.kWWWk..........', '..kWWWk.rrr.....', '...kWWWkrRrr....', '....kWWWkrRrr...', '.....kWWWkrRrr..',
    '......kWWWkrRr..', '.......kWWWkrr..', '........kWWWk...', '.........kWWWk..', '..........kWWWk.', '...........kWWk.', '............kk..', '................'],
  joint: [
    '................', '.kk..........kk.', 'kWWk........kWWk', 'kWWWk......kWWWk', '.kWWWk....kWWWk.', '..kWWWk..kWWWk..', '...kWWWkkWWWk...', '....kWWyyWWk....',
    '....kWyYYyWk....', '.....kyYYyk.....', '......kyyk......', '.......kk.......', '................', '................', '................', '................'],
  'neck-bones': [
    '..........kkk...', '.........kYYYkk.', '.........kYkYYYk', '..........kYYkk.', '..........kYYk..', '.........kYmYk..', '.........kYYk...', '........kYmYk...',
    '........kYYk....', '.......kYmYk....', '.......kYYk.....', '......kYmYk.....', '.....kYYYYkk....', '....kYYmYYYYk...', '....kYYYYYmYk...', '....kk.k.k.kk...'],
  digestion: [
    '.......kk.......', '.......pk.......', '.......pk.......', '......kpk.......', '.....kppkkk.....', '....kpppppppk...', '...kppppppppk...', '...kpppppppk....',
    '....kpppppk.....', '.....kkkpk......', '......kokk......', '.....kooook.....', '....kokkkkok....', '....koooooook...', '.....kkkkkokk...', '..........kk....'],
  breathing: [
    '.......kk.......', '.......ck.......', '.......ck.......', '.......ck.......', '......kcck......', '.....kc..ck.....', '..kkkc....ckkk..', '.kpppk....kpppk.',
    'kpprpk....kprppk', 'kpprppk..kpprppk', 'kppprpk..kprpppk', 'kpppppk..kpppppk', 'kpppppk..kpppppk', '.kppppk..kppppk.', '..kkkk....kkkk..', '................'],
  circulation: [
    '................', '..kkk.....kkk...', '.krrrk...krrrk..', 'krrwrrk.krrrrrk.', 'krwrrrrkrrrrrrk.', 'krrrrrrrrrrrrrk.', 'krrrrrrrrrrrrrk.', '.krrrrrrrrrrrk..',
    '..krrrrrrrrrk...', '...krrrrrrrk....', '....krrrrrk.....', '.....krrrk......', '......krk.......', '.......k........', '..bbb......rrr..', '.b...bbbrrr...r.'],
  excretion: [
    '................', '..kkk......kkk..', '.kRRRk....kRRRk.', 'kRRrRk....kRrRRk', 'kRrRk......kRrRk', 'kRRRk......kRRRk', 'kRRrRk....kRrRRk', '.kRRRk....kRRRk.',
    '..kkck....ckkk..', '....kc....ck....', '.....kc..ck.....', '......kcck......', '.....kyyyyk.....', '.....kyyyyk.....', '......kyyk......', '.......kk.......'],
  'organ-disease': [
    '.....kkkkkk.....', '....kgggggk.....', '..kkkkkkkkkkkk..', '..kWWWWWWWWWWk..', '..kWWWWrrWWWWk..', '..kWWWWrrWWWWk..', '..kWWrrrrrrWWk..', '..kWWrrrrrrWWk..',
    '..kWWWWrrWWWWk..', '..kWWWWrrWWWWk..', '..kWWWWWWWWWWk..', '..kWggggggggWk..', '..kWWWWWWWWWWk..', '..kWggggggWWWk..', '..kWWWWWWWWWWk..', '..kkkkkkkkkkkk..'],
  prevention: [
    '................', '...kkkkkkkkkk...', '..kaaaaaaaaaak..', '..kaaaawwaaaak..', '..kaaaawwaaaak..', '..kaawwwwwwaak..', '..kaawwwwwwaak..', '..kaaaawwaaaak..',
    '..kaaaawwaaaak..', '...kaaaaaaaak...', '...kaaaaaaaak...', '....kaaaaaak....', '.....kaaaak.....', '......kaak......', '.......kk.......', '................'],
  'bio-printing': [
    '....kkkkkkkk....', '....kddddddk....', '....kdGGGGdk....', '.....kkddkk.....', '.......kk.......', '.......p........', '................', '......kkkk......',
    '.....kppppk.....', '....kppkkppk....', '....kpk..kpk....', '....kppk.kpk....', '.....kpk.kpk....', '.....kppkppk....', '..gggkkppkkggg..', '..gggggggggggg..'],
  // ---------------------------------------------------------------- 푸른 생활 지구 (빛)
  'dark-box': [
    '................', '....kkkkkkkkkk..', '...kmmmmkkmmmk..', '..kmmmmmyymmmk..', '.kkkkkkkkkkkMk..', '.kmmmmmmmmmkMk..', '.kmmmmmmmmmkMk..', '.kmmmxxmmmmkMk..',
    '.kmmmxxmmmmkMk..', '.kmmmmmmmmmkMk..', '.kmmmmmmmmmkk...', '.kkkkkkkkkkk....', '................', '................', '................', '................'],
  'light-needed': [
    'y...............', '.y..y...........', '..y.............', 'y..f............', '....f...........', '.....kkkkkk.....', '...kkWWWWWWkk...', '..kWWWkkkkWWWk..',
    '.kWWWkbbbbkWWWk.', 'kWWWkbbzzbbkWWWk', '.kWWWkbbbbkWWWk.', '..kWWWkkkkWWWk..', '...kkWWWWWWkk...', '.....kkkkkk.....', '................', '................'],
  'seeing-path': [
    '..yyy...........', '.yfffy..........', '.yfffy.oo.......', '..yyy....oo.....', '...k.......oo...', '............okkk', '...........kkrrk', '...........krrrk',
    '..........okkkk.', '........oo......', '......oo........', '....oo..........', '.kkkk...........', 'kWbbWk..........', '.kkkk...........', '................'],
  'light-source': [
    '.......y........', '..y....y....y...', '...y.......y....', '......kkkk......', '.....kffffk.....', 'yy..kffyyffk..yy', '....kfyffyfk....', '....kffyyffk....',
    '.....kffffk.....', '......kffk......', '......kggk......', '......kGGk......', '......kggk......', '.......kk.......', '................', '................'],
  'light-straight': [
    '................', '..mm...mm...mm..', '..mm...mm...mm..', '..mm...mm...mm..', '..mm...mm...mm..', '..mm...mm...mm..', '..mm...mm...mm..', 'drrrrrrrrrrrrrry',
    '..mm...mm...mm..', '..mm...mm...mm..', '..mm...mm...mm..', '..mm...mm...mm..', '..mm...mm...mm..', '.MMMM.MMMM.MMMM.', '................', '................'],
  'light-reflect': [
    'r..............r', '.r............r.', '..r..........r..', '...r........r...', '....r......r....', '.....r....r.....', '......r..r......', '.......rr.......',
    'cccccccccccccccc', 'gggggggggggggggg', 'dddddddddddddddd', '................', '................', '................', '................', '................'],
  'light-refract': [
    'r...............', '.r..............', '..r.............', '...r............', '....r...........', '.....r..........', '......r.........', 'cccccccrcccccccc',
    'ccccccccrccccccc', 'ccccccccrccccccc', 'cccccccccrcccccc', 'cccccccccrcccccc', 'ccccccccccrccccc', 'ccccccccccrccccc', 'bbbbbbbbbbbbbbbb', '................'],
  'convex-concave': [
    '................', '...kk......kkkkk', '..kCCk.....kCCCk', '.kCCCCk.....kCk.', '.kCCCCk.....kCk.', 'kCCCCCCk....kCk.', 'kCwCCCCk....kCk.', 'kCwCCCCk....kCk.',
    'kCCCCCCk....kCk.', '.kCCCCk.....kCk.', '.kCCCCk.....kCk.', '..kCCk.....kCCCk', '...kk......kkkkk', '................', '................', '................'],
  'lens-uses': [
    '................', '................', 'k..............k', '.k............k.', '.kkkkkk..kkkkkk.', '.kCwCCk..kCwCCk.', '.kCCwCkkkkCCwCk.', '.kCCCCk..kCCCCk.',
    '.kCCCCk..kCCCCk.', '..kkkk....kkkk..', '................', '................', '................', '................', '................', '................'],
  'mirror-uses': [
    '.....kkkkk......', '...kkcCCCckk....', '..kcCCwCCCCck...', '..kcCwCCCCCck...', '.kcCCCCCCCCCck..', '.kcCCCCCCCCCck..', '.kcCCCCCCCCCck..', '..kcCCCCCCCck...',
    '..kcCCCCCCCck...', '...kkcCCCckk....', '.....kkmkk......', '.......mm.......', '.......mm.......', '.......mm.......', '.......mm.......', '.......kk.......'],
  periscope: [
    '................', '...kkkkkkk......', '..kcgggggk......', '..kcgggWgk......', '...kkkgWgk......', '.....kgggk......', '.....kgggk......', '.....kgggk......',
    '.....kgggk......', '.....kgggk......', '.....kgggkkk....', '.....kgWgggck...', '.....kggWggck...', '.....kkkkkkk....', '................', '................'],
  'magnifier-box': [
    '....kkkkk.......', '..kkCCCCCkk.....', '.kCCwwCCCCCk....', '.kCwCCCCCCCk....', 'kCCwCCCCCCCCk...', 'kCCCCCCCCCCCk...', 'kCCCCCCCCCCCk...', 'kCCCCCCCCCCCk...',
    '.kCCCCCCCCCk....', '.kCCCCCCCCCk....', '..kkCCCCCkkmk...', '....kkkkk.mmmk..', '...........mmmk.', '............mmmk', '.............mmk', '..............k.'],
  // ---------------------------------------------------------------- 푸른 생활 지구 (자원과 에너지)
  'resource-kinds': [
    '....c...........', '...ccc......mm..', '..cccCc....mMMm.', '..ccccc...mMmmMm', '...ccc....mMMMMm', '..........mmmmm.', '................', '................',
    '.....kkkkk......', '...kkGgGGgkk....', '..kGgGGdGGgGk...', '..kGGdGGGgGGk...', '...kkGGgGGkk....', '.....kkkkk......', '................', '................'],
  'reserve-graph': [
    '................', '.k.......rr.....', '.k.......rr.....', '.k.......rr.....', '.k.......rr.....', '.k.......rr.....', '.k.......rr.....', '.k.......rr.....',
    '.k.......rr.....', '.k.......rr.dd..', '.k.oo....rr.dd..', '.k.oo....rr.dd..', '.k.oo....rr.dd..', '.k.oo....rr.dd..', '.kkkkkkkkkkkkkkk', '................'],
  'resource-limit': [
    '..kkkkkkkkkkkk..', '..kmmmmmmmmmmk..', '...kTTTTTTTTk...', '...kT......Tk...', '....kT....Tk....', '.....kT..Tk.....', '......kTTk......', '......kTTk......',
    '.....kTttTk.....', '....kTttttTk....', '...kTttttttTk...', '...kTttttttTk...', '..kmmmmmmmmmmk..', '..kkkkkkkkkkkk..', '................', '................'],
  recycle: [
    '.....nnnnnn.....', '...nn......nn...', '..n..........n..', '.n...........nn.', '.n..........nnnn', 'n...............', 'n...............', 'n..............n',
    'n..............n', '...............n', 'nnnn..........n.', '.nn...........n.', '..n..........n..', '...nn......nn...', '.....nnnnnn.....', '................'],
  replenish: [
    '..y.y...........', '...yyy..........', '.yyfyyy.........', '...yyy..........', '..y.y...........', '.........CCCCC..', '.......CCCCC....', '..........CCCC..',
    '................', '................', '.cc...cc...cc...', 'cbbccbbccbbccbb.', 'bbbbbbbbbbbbbbbb', 'BBBBBBBBBBBBBBBB', '................', '................'],
  'tidal-power': [
    '................', '................', '................', '.......kkk......', 'cccccc.kGk......', 'bbbbbb.kGk......', 'bbbbbb.kGk......', 'bbbbbb.kyk.cccc.',
    'bbbbbb.kGk.bbbb.', 'bbbbbb.kGk.bbbb.', 'BBBBBBkkGkkBBBB.', 'mmmmmmmmmmmmmmmm', '................', '................', '................', '................'],
  'energy-mix': [
    '...........w....', '...........w....', '.........wwkww..', '...........g....', '...........g....', '...........g....', '..kkkkkk...g....', '.kbBbBbk...g....',
    '.kBbBbBk...g....', 'kbBbBbk....g....', 'kkkkkkk....g....', '...dd......g....', '...dd.....ggg...', 'nnnnnnnnnnnnnnnn', '................', '................'],
  'bio-energy': [
    '.......nn.......', '......nlln......', '......nlln......', '.......nn.......', '.......dd.......', '....kkkkkkkk....', '...kggggggggk...', '..kggggggggggk..',
    '..kgggnnnngggk..', '..kgggnlnngggk..', '..kggggggggggk..', '..kggggggggggk..', '..kkkkkkkkkkkk..', '.mmmmmmmmmmmmmm.', '................', '................'],
  'reuse-recycle': [
    '................', '..kkkkkkkk......', '..kWWWWWWkk.....', '..kWggggWWk.....', '..kWWWWWWWk.....', '..kWggggWWk.....', '..kWWWWWWWk..n..', '..kWggggWWk.nnn.',
    '..kWWWWWWWk..n..', '..kkkkkkkkk..n..', '.............n..', '...n.........n..', '..nnn......nn...', '...nnnnnnnn.....', '................', '................'],
  'same-condition': [
    '................', '...k........k...', '..kWk......kyk..', '.kWWWk....kyyyk.', 'kWWWWWk..kyWWWyk', 'kWWWWWk..kyWWWyk', 'kWWrWWk..kyWrWyk', 'kWWWWWk..kyWWWyk',
    'kkkkkkk..kkkkkkk', 'cccccccccccccccc', 'cccccccccccccccc', '................', '................', '................', '................', '................'],
  insulation: [
    '.......kk.......', '......krrk......', '.....krrrrk.....', '....krrrrrrk....', '...krrrrrrrrk...', '..krrrrrrrrrrk..', '..kppppppppppk..', '..kpkkkkkkkkpk..',
    '..kpkWWWWWWkpk..', '..kpkWyyWWWkpk..', '..kpkWyyWWWkpk..', '..kpkWWWWWWkpk..', '..kpkkkkkkkkpk..', '..kppppppppppk..', '..kkkkkkkkkkkk..', '................'],
  // 북쪽 자매 마을 동토 탐사(R5-G10)
  permafrost: [
    '................', '.............yy.', '............yyyy', '.............yy.', '................', 'nnnnnlnnnnnlnnnn', 'NNNNNNNNNNNNNNNN', 'mmmemmmmmemmmmmm',
    'mmmmmmcmmmmmmemm', 'memmmmmmmmmmmmmm', 'rrrrrrrrrrrrrrrr', 'ccCcccccCcccccCc', 'cCCccccCCccccCCc', 'ccccCcccccCccccc', 'cCccccCCcccccCcc', 'cccccccccccccccc'],
  'known-unknown': [
    '................', '.kkkkkkkkkkkkkk.', '.kWWWWWWkWWWWWk.', '.kWWWWWnkWbbbWk.', '.kWWWWnnkbWWWbk.', '.kWWWWnWkWWWWbk.', '.knWWnnWkWWWbWk.', '.knnWnWWkWWbWWk.',
    '.kWnnnWWkWWbWWk.', '.kWWnWWWkWWWWWk.', '.kWWWWWWkWWbWWk.', '.kWWWWWWkWWWWWk.', '.kkkkkkkkkkkkkk.', '................'],
  'yamal-anthrax': [
    '.T...T..........', '.TT.TT..........', '..TTT...........', '...T............', '..mmm...........', '.mmkm...........', 'Wmmmm...........', '..mmmmmmmmmmmm..',
    '..mmmmmmmmmmmmm.', '...mmmmmmmmmmmm.', '...mWWmmmmmmmm..', '...M.M....M.M...', '...M.M....M.M...', '...M.M....M.M...', 'tttttttttttttttt'],
};

const cache = new Map();
const SHADOW = '#33456e';
// 카드 그림 캔버스. locked이면 그림자 한 색으로 그린다.
export function dexIcon(id, size = 48, locked = false) {
  const key = id + '@' + size + (locked ? '#' : '');
  if (!cache.has(key)) {
    const base = document.createElement('canvas'); base.width = base.height = 16;
    const x = base.getContext('2d');
    (ART[id] || []).forEach((row, j) => { for (let i = 0; i < 16; i++) { const ch = row[i]; if (ch && ch !== '.' && P[ch]) { x.fillStyle = locked ? SHADOW : P[ch]; x.fillRect(i, j, 1, 1); } } });
    const c = document.createElement('canvas'); c.width = c.height = size;
    const cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(base, 0, 0, size, size);
    cache.set(key, c);
  }
  const src = cache.get(key), out = document.createElement('canvas');
  out.width = out.height = size; out.getContext('2d').drawImage(src, 0, 0);
  out.className = 'dex-icon'; out.setAttribute('aria-hidden', 'true');
  return out;
}
