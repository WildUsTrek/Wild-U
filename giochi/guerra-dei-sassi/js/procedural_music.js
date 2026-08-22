/*
  Sfida dei Sassi V37.13 — Groove Recomposition
  Rebuilds the procedural songs from rhythm + bassline + hook.
  Preserves V37.12h warm instruments, pitch-aware gain, limiter, mixer defaults and sync.
*/
(function () {
  'use strict';

  const REST = null;
  // V37.15A: note factory retrocompatibile.
  // Vecchio uso: N(n,d,a). Nuovo uso: N(n,d,a,targetStep,grooveShift).
  function N(n, d, a, targetStep, grooveShift, flags) {
    const ev = { n, d: d || 1, a: a || 1 };
    if (typeof targetStep === 'number' && Number.isFinite(targetStep)) ev.s = targetStep;
    if (typeof grooveShift === 'number' && Number.isFinite(grooveShift)) ev.g = grooveShift;
    if (flags && typeof flags === 'object') {
      for (const k in flags) if (Object.prototype.hasOwnProperty.call(flags,k)) ev[k]=flags[k];
    }
    return ev;
  }
  // Phrase helper: array eventi con durata loop 16/32/64, mantenendo compatibilità con array normali.
  function PH(events, loopSteps) {
    const arr = Array.isArray(events) ? events : [];
    Object.defineProperty(arr, 'loopSteps', { value: Math.max(16, Number(loopSteps) || 16), enumerable: false });
    return arr;
  }
  // V37.15C: hook event con dyad/accordo/stab opzionale. Non sostituisce N(), lo affianca.
  function HK(n, d, a, targetStep, grooveShift, chord, flags) {
    const ev = N(n, d, a, targetStep, grooveShift);
    if (Array.isArray(chord) && chord.length) ev.ch = chord.slice(0, 3);
    if (flags && typeof flags === 'object') {
      for (const k in flags) if (Object.prototype.hasOwnProperty.call(flags,k)) ev[k]=flags[k];
    }
    return ev;
  }

  /*
    Composition model:
    - drum: dedicated groove signatures per character.
    - bass: memorable low/mid riff per section.
    - lead: hook/call-response per section.
    - fill: bar-end transition accents.
    Notes are semitone offsets from each preset root.
  */
  const PRESETS = {
    menu: {
      id:'menu', bpm:66, root:261.63, groove:'menu', instrument:'warmKeys', gain:.54, tensionStyle:'none',
      filter:1320, delay:.31,
      bus:{ lead:1.00, chorus:1.10, tension:.75, pad:.30, bass:.62, perc:.44, harmony:.44 },
      chords:[[0,4,7,11],[-5,-1,2,7],[-3,0,4,9],[-7,-3,0,4]],
      drum:{ kick:[0,8], snare:[12], hat:[2,6,10,14], ghost:[5] },
      bass:{
        verse:[N(-24,2,.85),REST,N(-17,1,.65),REST,N(-19,2,.70),REST,N(-12,2,.70),REST],
        pre:[N(-24,1,.80),REST,N(-19,1,.65),REST,N(-17,1,.65),REST,N(-12,2,.72),REST],
        chorus:[N(-24,1,.85),REST,N(-19,1,.75),N(-17,1,.72),REST,N(-12,2,.78),REST],
        bridge:[N(-31,2,.70),REST,N(-24,2,.78),REST,N(-19,2,.70),REST]
      },
      lead:{
        intro:PH([HK(4,3,.78,0,0,[3,7],{leg:true,e:false,h:true,stab:true}),N(5,2,.58,5,-.06,{h:true,leg:true}),N(4,1,.54,6,-.16,{run:true}),N(5,1,.62,7,-.12,{run:true}),HK(7,3,.78,8,0,[4,7],{leg:true,e:true}),N(9,2,.58,13,-.06,{h:true,leg:true}),N(5,1,.54,14,-.16,{run:true}),N(7,1,.62,15,-.12,{run:true}),HK(9,3,.78,16,0,[3,7],{leg:true,e:false,h:true}),N(11,2,.58,21,-.06,{h:true,leg:true}),N(2,1,.54,22,-.16,{run:true}),N(4,1,.62,23,-.12,{run:true}),HK(5,4,.78,24,0,[4,7],{leg:true,e:true}),N(7,2,.58,29,-.06,{h:true,leg:true})],32),
        verse:PH([HK(7,3,.84,0,0,[5,4],{leg:true,e:false,h:true,stab:true}),N(9,2,.64,5,-.06,{h:true,leg:true}),N(4,1,.54,6,-.16,{run:true}),N(5,1,.62,7,-.12,{run:true}),HK(7,3,.84,8,0,[4,7],{leg:true,e:true}),N(9,2,.64,13,-.06,{h:true,leg:true}),N(5,1,.54,14,-.16,{run:true}),N(7,1,.62,15,-.12,{run:true}),HK(9,3,.84,16,0,[3,7],{leg:true,e:false,h:true}),N(11,2,.64,21,-.06,{h:true,leg:true}),N(2,1,.54,22,-.16,{run:true}),N(4,1,.62,23,-.12,{run:true}),HK(5,4,.84,24,0,[4,7],{leg:true,e:true}),N(7,2,.64,29,-.06,{h:true,leg:true})],32),
        pre:PH([HK(7,3,.84,0,0,[5,4],{leg:true,e:false,h:true,stab:true}),N(9,2,.64,5,-.06,{h:true,leg:true}),N(4,1,.54,6,-.16,{run:true}),N(5,1,.62,7,-.12,{run:true}),HK(7,3,.84,8,0,[4,7],{leg:true,e:true}),N(9,2,.64,13,-.06,{h:true,leg:true}),N(9,1,.54,14,-.16,{run:true}),N(11,1,.62,15,-.12,{run:true}),HK(12,3,.84,16,0,[4,9],{leg:true,e:false,h:true}),N(14,2,.64,21,-.06,{h:true,leg:true}),N(5,1,.54,22,-.16,{run:true}),N(7,1,.62,23,-.12,{run:true}),HK(9,4,.84,24,0,[3,7],{leg:true,e:true}),N(11,2,.64,29,-.06,{h:true,leg:true})],32),
        chorus:PH([HK(7,4,1,0,0,[5,4],{stab:true,accent:true,h:true}),N(9,2,.76,6,-.08,{h:true,leg:true}),HK(7,4,.9,8,0,[4,7],{leg:true,e:true}),N(5,2,.56,13,.04,{h:true,leg:true}),N(5,1,.62,14,-.22,{run:true}),N(7,1,.7,15,-.18,{run:true}),HK(9,4,1,16,0,[3,7],{stab:true,accent:true,h:true}),N(11,2,.76,22,-.08,{h:true,leg:true}),HK(9,4,.9,24,0,[3,7],{leg:true,e:true}),N(7,2,.56,29,.04,{h:true,leg:true}),N(4,1,.62,30,-.22,{run:true}),N(5,1,.7,31,-.18,{run:true}),HK(7,4,1,32,0,[5,4],{stab:true,accent:true,h:true}),N(9,2,.76,38,-.08,{h:true,leg:true}),HK(7,4,.9,40,0,[4,7],{leg:true,e:true}),N(5,2,.56,45,.04,{h:true,leg:true}),HK(12,4,.94,48,0,[4,9],{stab:true,h:true}),N(11,1,.64,52,-.1,{run:true}),N(9,1,.62,53,-.08,{run:true}),N(9,2,.72,54,-.06,{leg:true,h:true}),HK(5,5,.92,56,0,[4,7],{leg:true,e:true}),N(4,1,.62,62,-.22,{run:true}),N(5,1,.7,63,-.18,{run:true})],64),
        bridge:PH([HK(4,3,.78,0,0,[3,7],{leg:true,e:false,h:true,stab:true}),N(5,2,.58,5,-.06,{h:true,leg:true}),N(-1,1,.54,6,-.16,{run:true}),N(0,1,.62,7,-.12,{run:true}),HK(2,3,.78,8,0,[5,9],{leg:true,e:true}),N(4,2,.58,13,-.06,{h:true,leg:true}),N(0,1,.54,14,-.16,{run:true}),N(2,1,.62,15,-.12,{run:true}),HK(4,3,.78,16,0,[5,8],{leg:true,e:false,h:true}),N(5,2,.58,21,-.06,{h:true,leg:true}),N(0,1,.54,22,-.16,{run:true}),N(2,1,.62,23,-.12,{run:true}),HK(4,4,.78,24,0,[5,8],{leg:true,e:true}),N(5,2,.58,29,-.06,{h:true,leg:true})],32)
      }
    },

    'nina-ciottolo': {
      id:'nina-ciottolo', bpm:80, root:293.66, groove:'stream', instrument:'softKalimba', gain:.63, tensionStyle:'none',
      filter:1600, delay:.33,
      bus:{ lead:1.14, chorus:1.28, tension:.84, pad:.24, bass:.76, perc:.58, harmony:.52 },
      chords:[[0,4,7,14],[-5,-1,2,9],[-3,0,4,11],[-7,-3,0,7]],
      drum:{ kick:[0,7,10], snare:[4,12], hat:[2,5,8,11,14], ghost:[3,15] },
      bass:{
        verse:[N(-24,1,.86),REST,N(-19,1,.74),REST,N(-17,1,.76),N(-19,1,.68),REST,N(-12,2,.78),REST],
        pre:[N(-24,1,.82),N(-19,1,.70),REST,N(-17,1,.72),REST,N(-12,2,.80),REST,N(-17,1,.68)],
        chorus:[N(-24,1,.90),REST,N(-17,1,.82),N(-12,1,.86),REST,N(-14,1,.72),N(-17,1,.78),REST,N(-19,2,.80)],
        bridge:[N(-31,2,.70),REST,N(-24,1,.82),N(-19,1,.74),REST,N(-17,2,.72),REST]
      },
      lead:{
        intro:PH([HK(4,3,.78,0,0,[3,8],{leg:true,e:false,h:true,stab:true}),N(5,2,.58,5,-.06,{h:true,leg:true}),N(4,1,.54,6,-.16,{run:true}),N(5,1,.62,7,-.12,{run:true}),HK(7,3,.78,8,0,[4,7],{leg:true,e:true}),N(9,2,.58,13,-.06,{h:true,leg:true}),N(5,1,.54,14,-.16,{run:true}),N(7,1,.62,15,-.12,{run:true}),HK(9,3,.78,16,0,[3,7],{leg:true,e:false,h:true}),N(11,2,.58,21,-.06,{h:true,leg:true}),N(2,1,.54,22,-.16,{run:true}),N(4,1,.62,23,-.12,{run:true}),HK(5,4,.78,24,0,[4,7],{leg:true,e:true}),N(7,2,.58,29,-.06,{h:true,leg:true})],32),
        verse:PH([HK(7,3,.84,0,0,[5,7],{leg:true,e:false,h:true,stab:true}),N(9,2,.64,5,-.06,{h:true,leg:true}),N(4,1,.54,6,-.16,{run:true}),N(5,1,.62,7,-.12,{run:true}),HK(7,3,.84,8,0,[4,7],{leg:true,e:true}),N(9,2,.64,13,-.06,{h:true,leg:true}),N(5,1,.54,14,-.16,{run:true}),N(7,1,.62,15,-.12,{run:true}),HK(9,3,.84,16,0,[3,7],{leg:true,e:false,h:true}),N(11,2,.64,21,-.06,{h:true,leg:true}),N(4,1,.54,22,-.16,{run:true}),N(5,1,.62,23,-.12,{run:true}),HK(7,4,.84,24,0,[5,2],{leg:true,e:true}),N(9,2,.64,29,-.06,{h:true,leg:true})],32),
        pre:PH([HK(7,3,.84,0,0,[5,7],{leg:true,e:false,h:true,stab:true}),N(9,2,.64,5,-.06,{h:true,leg:true}),N(5,1,.54,6,-.16,{run:true}),N(7,1,.62,7,-.12,{run:true}),HK(9,3,.84,8,0,[5,2],{leg:true,e:true}),N(11,2,.64,13,-.06,{h:true,leg:true}),N(7,1,.54,14,-.16,{run:true}),N(9,1,.62,15,-.12,{run:true}),HK(11,3,.84,16,0,[5],{leg:true,e:false,h:true}),N(12,2,.64,21,-.06,{h:true,leg:true}),N(5,1,.54,22,-.16,{run:true}),N(7,1,.62,23,-.12,{run:true}),HK(9,4,.84,24,0,[3,8],{leg:true,e:true}),N(11,2,.64,29,-.06,{h:true,leg:true})],32),
        chorus:PH([HK(7,4,1,0,0,[5,7],{stab:true,accent:true,h:true}),N(9,2,.76,6,-.08,{h:true,leg:true}),HK(7,4,.9,8,0,[4,7],{leg:true,e:true}),N(5,2,.56,13,.04,{h:true,leg:true}),N(5,1,.62,14,-.22,{run:true}),N(7,1,.7,15,-.18,{run:true}),HK(9,4,1,16,0,[3,7],{stab:true,accent:true,h:true}),N(11,2,.76,22,-.08,{h:true,leg:true}),HK(9,4,.9,24,0,[3,8],{leg:true,e:true}),N(7,2,.56,29,.04,{h:true,leg:true}),N(4,1,.62,30,-.22,{run:true}),N(5,1,.7,31,-.18,{run:true}),HK(7,4,1,32,0,[5,7],{stab:true,accent:true,h:true}),N(9,2,.76,38,-.08,{h:true,leg:true}),HK(7,4,.9,40,0,[4,7],{leg:true,e:true}),N(5,2,.56,45,.04,{h:true,leg:true}),HK(12,4,.94,48,0,[4,9],{stab:true,h:true}),N(11,1,.64,52,-.1,{run:true}),N(9,1,.62,53,-.08,{run:true}),N(9,2,.72,54,-.06,{leg:true,h:true}),HK(7,5,.92,56,0,[5,2],{leg:true,e:true}),N(4,1,.62,62,-.22,{run:true}),N(5,1,.7,63,-.18,{run:true})],64),
        bridge:PH([HK(2,3,.78,0,0,[5,2],{leg:true,e:false,h:true,stab:true}),N(4,2,.58,5,-.06,{h:true,leg:true}),N(-1,1,.54,6,-.16,{run:true}),N(0,1,.62,7,-.12,{run:true}),HK(2,3,.78,8,0,[5,7],{leg:true,e:true}),N(4,2,.58,13,-.06,{h:true,leg:true}),N(0,1,.54,14,-.16,{run:true}),N(2,1,.62,15,-.12,{run:true}),HK(4,3,.78,16,0,[5,7],{leg:true,e:false,h:true}),N(5,2,.58,21,-.06,{h:true,leg:true}),N(2,1,.54,22,-.16,{run:true}),N(4,1,.62,23,-.12,{run:true}),HK(5,4,.78,24,0,[4,7],{leg:true,e:true}),N(7,2,.58,29,-.06,{h:true,leg:true})],32)
      }
    },

    'bruno-basalto': {
      id:'bruno-basalto', bpm:72, root:130.81, groove:'quarry', instrument:'woodMallet', gain:.65, tensionStyle:'none',
      filter:1080, delay:.18,
      bus:{ lead:1.10, chorus:1.25, tension:.84, pad:.22, bass:.96, perc:.72, harmony:.38 },
      chords:[[0,3,7,10],[-5,-2,2,7],[-3,0,5,9],[-7,-3,0,5]],
      drum:{ kick:[0,3,8,11], snare:[4,12], hat:[2,6,10,14], ghost:[7,15] },
      bass:{
        verse:[N(-24,2,.95),REST,N(-31,1,.70),N(-24,1,.90),REST,N(-21,2,.82),REST,N(-24,1,.88)],
        pre:[N(-24,1,.90),REST,N(-21,1,.74),REST,N(-19,1,.78),REST,N(-17,2,.78),REST],
        chorus:[N(-24,1,.98),N(-21,1,.78),N(-17,2,.92),REST,N(-21,1,.76),N(-24,2,.94),REST,N(-31,1,.72)],
        bridge:[N(-31,2,.82),REST,N(-29,2,.78),REST,N(-24,2,.92),REST]
      },
      lead:{
        intro:PH([HK(0,4,.82,0,0,[3,7],{stab:true,leg:true,accent:true}),N(-2,2,.62,5,-.05,{h:true,leg:true}),HK(-2,4,.82,8,0,[4,9],{stab:false,leg:true,accent:false}),N(-5,2,.62,13,-.05,{h:true,leg:true}),HK(0,4,.82,16,0,[5,9],{stab:false,leg:true,accent:false}),N(-2,2,.62,21,-.05,{h:true,leg:true}),HK(0,4,.82,24,0,[5,9],{stab:false,leg:true,accent:false}),N(-2,2,.62,29,-.05,{h:true,leg:true})],32),
        verse:PH([HK(0,4,.82,0,0,[3,7],{stab:true,leg:true,accent:true}),N(-2,2,.62,5,-.05,{h:true,leg:true}),HK(-2,4,.82,8,0,[4,9],{stab:false,leg:true,accent:false}),N(-5,2,.62,13,-.05,{h:true,leg:true}),HK(0,4,.82,16,0,[5,9],{stab:false,leg:true,accent:false}),N(-2,2,.62,21,-.05,{h:true,leg:true}),HK(0,4,.82,24,0,[5,9],{stab:false,leg:true,accent:false}),N(-2,2,.62,29,-.05,{h:true,leg:true})],32),
        pre:PH([HK(3,4,.82,0,0,[4,7],{stab:true,leg:true,accent:true}),N(2,2,.62,5,-.05,{h:true,leg:true}),HK(7,4,.82,8,0,[3,7],{stab:false,leg:true,accent:false}),N(5,2,.62,13,-.05,{h:true,leg:true}),HK(5,4,.82,16,0,[4,7],{stab:false,leg:true,accent:false}),N(3,2,.62,21,-.05,{h:true,leg:true}),HK(5,4,.82,24,0,[4,7],{stab:false,leg:true,accent:false}),N(3,2,.62,29,-.05,{h:true,leg:true})],32),
        chorus:PH([N(10,1,.58,62,-.22,{run:true}),N(12,1,.7,63,-.16,{run:true}),HK(12,4,.98,0,0,[3,7],{stab:true,accent:true,h:true}),N(19,1,.62,5,-.08,{run:true}),N(17,1,.66,6,-.05,{run:true}),N(15,1,.62,7,-.02,{run:true}),HK(14,4,.92,8,0,[5,8],{leg:true,e:true}),N(12,1,.58,13,-.08,{run:true}),N(10,1,.56,14,-.04,{run:true}),HK(12,4,.9,16,0,[5,9],{leg:true,h:true}),N(17,1,.6,22,-.08,{run:true}),N(19,1,.64,23,-.04,{run:true}),HK(17,4,.96,24,0,[4,7],{stab:true,accent:true}),HK(12,4,.96,32,0,[3,7],{stab:true,accent:true,h:true}),N(19,1,.6,37,-.08,{run:true}),N(17,1,.62,38,-.05,{run:true}),N(15,1,.58,39,-.02,{run:true}),HK(19,4,.9,40,0,[3,7],{leg:true,e:true}),HK(17,4,.94,48,0,[4,7],{stab:true,accent:true}),N(12,1,.58,53,-.08,{run:true}),N(10,1,.56,54,-.04,{run:true}),N(7,1,.58,55,-.02,{run:true}),HK(12,6,.94,56,0,[5,9],{leg:true,e:true})],64),
        bridge:PH([HK(-5,4,.82,0,0,[5,3],{stab:true,leg:true,accent:true}),N(-7,2,.62,5,-.05,{h:true,leg:true}),HK(-5,4,.82,8,0,[3,7],{stab:false,leg:true,accent:false}),N(-7,2,.62,13,-.05,{h:true,leg:true}),HK(-3,4,.82,16,0,[3,8],{stab:false,leg:true,accent:false}),N(-5,2,.62,21,-.05,{h:true,leg:true}),HK(-3,4,.82,24,0,[3,8],{stab:false,leg:true,accent:false}),N(-5,2,.62,29,-.05,{h:true,leg:true})],32)
      }
    },

    'mara-selce': {
      id:'mara-selce', bpm:78, root:220.00, groove:'ravine', instrument:'mellowLead', gain:.60, tensionStyle:'none',
      filter:1400, delay:.39,
      bus:{ lead:1.06, chorus:1.20, tension:.82, pad:.30, bass:.72, perc:.42, harmony:.58 },
      chords:[[0,3,7,12],[-2,2,5,9],[-5,-2,3,7],[-7,-3,0,5]],
      drum:{ kick:[0,9], snare:[6,14], hat:[3,7,11,15], ghost:[5,13] },
      bass:{
        verse:[N(-24,2,.78),REST,N(-17,2,.70),REST,N(-14,2,.68),REST,N(-17,1,.66),REST],
        pre:[N(-24,1,.72),REST,N(-22,1,.66),REST,N(-17,2,.72),REST,N(-12,1,.68),REST],
        chorus:[N(-24,1,.82),REST,N(-17,1,.72),N(-12,2,.78),REST,N(-14,1,.66),N(-17,2,.70),REST],
        bridge:[N(-31,3,.66),REST,N(-24,2,.74),REST,N(-19,2,.68),REST]
      },
      lead:{
        intro:PH([HK(7,4,.82,0,0,[5,8],{leg:true,h:true}),N(5,2,.62,6,-.05,{h:true,leg:true}),N(2,1,.56,6,-.14,{run:true}),N(3,1,.62,7,-.1,{run:true}),HK(5,4,.82,8,0,[5,4],{leg:true,h:false}),N(3,2,.62,14,-.05,{h:true,leg:true}),N(7,1,.56,14,-.14,{run:true}),N(9,1,.62,15,-.1,{run:true}),HK(7,4,.82,16,0,[3,8],{leg:true,h:true}),N(9,2,.62,22,-.05,{h:true,leg:true}),N(2,1,.56,22,-.14,{run:true}),N(3,1,.62,23,-.1,{run:true}),HK(5,4,.82,24,0,[4,7],{leg:true,h:false}),N(3,2,.62,30,-.05,{h:true,leg:true})],32),
        verse:PH([HK(7,4,.82,0,0,[5,8],{leg:true,h:true}),N(5,2,.62,6,-.05,{h:true,leg:true}),N(2,1,.56,6,-.14,{run:true}),N(3,1,.62,7,-.1,{run:true}),HK(5,4,.82,8,0,[5,4],{leg:true,h:false}),N(3,2,.62,14,-.05,{h:true,leg:true}),N(7,1,.56,14,-.14,{run:true}),N(9,1,.62,15,-.1,{run:true}),HK(7,4,.82,16,0,[3,8],{leg:true,h:true}),N(9,2,.62,22,-.05,{h:true,leg:true}),N(2,1,.56,22,-.14,{run:true}),N(3,1,.62,23,-.1,{run:true}),HK(5,4,.82,24,0,[4,7],{leg:true,h:false}),N(3,2,.62,30,-.05,{h:true,leg:true})],32),
        pre:PH([HK(12,4,.82,0,0,[3,7],{leg:true,h:true}),N(10,2,.62,6,-.05,{h:true,leg:true}),N(7,1,.56,6,-.14,{run:true}),N(9,1,.62,7,-.1,{run:true}),HK(10,4,.82,8,0,[4,7],{leg:true,h:false}),N(9,2,.62,14,-.05,{h:true,leg:true}),N(7,1,.56,14,-.14,{run:true}),N(9,1,.62,15,-.1,{run:true}),HK(10,4,.82,16,0,[5,9],{leg:true,h:true}),N(9,2,.62,22,-.05,{h:true,leg:true}),N(5,1,.56,22,-.14,{run:true}),N(7,1,.62,23,-.1,{run:true}),HK(9,4,.82,24,0,[3,8],{leg:true,h:false}),N(7,2,.62,30,-.05,{h:true,leg:true})],32),
        chorus:PH([N(12,1,.8,0,0,{leg:true}),N(12,1,.76,2,-.25,{run:true}),HK(12,3,.9,3,0,[3,7],{stab:true,accent:true,h:true}),N(10,2,.58,8,-.06,{h:true,leg:true}),HK(7,4,.82,16,0,[3,8],{leg:true,e:true}),N(7,1,.56,22,-.08,{run:true}),N(9,1,.6,23,-.04,{run:true}),HK(9,3,.82,24,0,[3],{leg:true,h:true}),N(12,1,.76,32,0,{leg:true}),N(12,1,.72,34,-.25,{run:true}),HK(12,3,.88,35,0,[3,7],{stab:true,accent:true,e:true}),N(10,2,.58,40,-.06,{h:true,leg:true}),HK(7,5,.8,48,0,[3],{leg:true,h:true}),N(5,1,.54,56,-.08,{run:true}),N(7,1,.58,57,-.04,{run:true}),HK(9,4,.78,58,0,[3],{leg:true,e:true})],64),
        bridge:PH([HK(3,4,.82,0,0,[4,9],{leg:true,h:true}),N(2,2,.62,6,-.05,{h:true,leg:true}),N(-2,1,.56,6,-.14,{run:true}),N(0,1,.62,7,-.1,{run:true}),HK(2,4,.82,8,0,[3,7],{leg:true,h:false}),N(0,2,.62,14,-.05,{h:true,leg:true}),N(0,1,.56,14,-.14,{run:true}),N(2,1,.62,15,-.1,{run:true}),HK(3,4,.82,16,0,[4,7],{leg:true,h:true}),N(2,2,.62,22,-.05,{h:true,leg:true}),N(2,1,.56,22,-.14,{run:true}),N(3,1,.62,23,-.1,{run:true}),HK(5,4,.82,24,0,[4,7],{leg:true,h:false}),N(3,2,.62,30,-.05,{h:true,leg:true})],32)
      }
    },

    'teo-pietrafocaia': {
      id:'teo-pietrafocaia', bpm:86, root:164.81, groove:'forge', instrument:'warmKeys', gain:.66, tensionStyle:'none',
      filter:1320, delay:.17,
      bus:{ lead:1.14, chorus:1.30, tension:.88, pad:.20, bass:.84, perc:.76, harmony:.42 },
      chords:[[0,3,7,10],[-4,0,3,7],[-7,-3,0,5],[-2,2,5,9]],
      drum:{ kick:[0,6,8,13], snare:[4,12], hat:[1,3,5,7,9,11,13,15], ghost:[10] },
      bass:{
        verse:[N(-24,1,.88),REST,N(-21,1,.72),N(-24,1,.78),REST,N(-17,2,.82),REST,N(-21,1,.72),N(-14,1,.70)],
        pre:[N(-24,1,.86),N(-21,1,.74),REST,N(-17,1,.76),N(-14,1,.70),REST,N(-17,2,.78),REST],
        chorus:[N(-24,1,.94),REST,N(-17,1,.82),N(-14,1,.86),REST,N(-17,1,.78),N(-21,1,.70),N(-24,2,.90)],
        bridge:[N(-28,1,.70),N(-24,1,.82),N(-21,1,.74),N(-17,2,.86),REST,N(-21,1,.72),N(-24,2,.78)]
      },
      lead:{
        intro:PH([HK(3,4,.82,0,0,[4,7],{leg:true,h:true}),N(2,2,.62,6,-.05,{h:true,leg:true}),N(0,1,.56,6,-.14,{run:true}),N(2,1,.62,7,-.1,{run:true}),HK(3,4,.82,8,0,[5,4],{leg:true,h:false}),N(2,2,.62,14,-.05,{h:true,leg:true}),N(2,1,.56,14,-.14,{run:true}),N(3,1,.62,15,-.1,{run:true}),HK(5,4,.82,16,0,[4,7],{leg:true,h:true}),N(3,2,.62,22,-.05,{h:true,leg:true}),N(-2,1,.56,22,-.14,{run:true}),N(0,1,.62,23,-.1,{run:true}),HK(2,4,.82,24,0,[3,7],{leg:true,h:false}),N(0,2,.62,30,-.05,{h:true,leg:true})],32),
        verse:PH([HK(7,4,.82,0,0,[5,3],{leg:true,h:true}),N(5,2,.62,6,-.05,{h:true,leg:true}),N(3,1,.56,6,-.14,{run:true}),N(5,1,.62,7,-.1,{run:true}),HK(7,4,.82,8,0,[5,8],{leg:true,h:false}),N(5,2,.62,14,-.05,{h:true,leg:true}),N(5,1,.56,14,-.14,{run:true}),N(7,1,.62,15,-.1,{run:true}),HK(5,4,.82,16,0,[4,7],{leg:true,h:true}),N(7,2,.62,22,-.05,{h:true,leg:true}),N(2,1,.56,22,-.14,{run:true}),N(3,1,.62,23,-.1,{run:true}),HK(5,4,.82,24,0,[5,4],{leg:true,h:false}),N(3,2,.62,30,-.05,{h:true,leg:true})],32),
        pre:PH([HK(10,4,.82,0,0,[5,2],{leg:true,h:true}),N(7,2,.62,6,-.05,{h:true,leg:true}),N(5,1,.56,6,-.14,{run:true}),N(7,1,.62,7,-.1,{run:true}),HK(8,4,.82,8,0,[4,7],{leg:true,h:false}),N(7,2,.62,14,-.05,{h:true,leg:true}),N(7,1,.56,14,-.14,{run:true}),N(10,1,.62,15,-.1,{run:true}),HK(9,4,.82,16,0,[3,8],{leg:true,h:true}),N(10,2,.62,22,-.05,{h:true,leg:true}),N(5,1,.56,22,-.14,{run:true}),N(7,1,.62,23,-.1,{run:true}),HK(10,4,.82,24,0,[4,7],{leg:true,h:false}),N(7,2,.62,30,-.05,{h:true,leg:true})],32),
        chorus:PH([N(5,1,.56,62,-.22,{run:true}),N(7,1,.66,63,-.16,{run:true}),HK(7,4,.92,0,0,[3],{stab:true,accent:true,h:true}),N(5,1,.58,5,-.1,{run:true}),N(7,1,.64,6,-.06,{run:true}),HK(12,4,.86,8,0,[3,7],{leg:true,e:true}),N(10,1,.56,14,-.1,{run:true}),N(12,1,.62,15,-.06,{run:true}),HK(12,4,.88,16,0,[5,9],{leg:true,h:true}),N(9,1,.56,22,-.08,{run:true}),N(5,1,.6,23,-.04,{run:true}),HK(9,4,.84,24,0,[5],{leg:true}),HK(4,4,1,32,0,[7,12],{stab:true,accent:true,lift:true}),N(7,1,.66,36,-.1,{run:true}),N(5,1,.64,37,-.07,{run:true}),N(3,1,.58,38,-.04,{run:true}),HK(7,4,.86,40,0,[5],{leg:true,e:true}),N(5,1,.6,45,-.1,{run:true}),N(7,1,.66,46,-.06,{run:true}),N(10,1,.62,47,-.03,{run:true}),HK(12,4,.92,48,0,[5,9],{stab:true,accent:true}),N(9,1,.58,53,-.1,{run:true}),N(7,1,.62,54,-.06,{run:true}),N(5,1,.6,55,-.03,{run:true}),HK(14,5,.9,56,0,[3,7],{leg:true,e:true})],64),
        bridge:PH([HK(0,4,.82,0,0,[3,7],{leg:true,h:true}),N(-2,2,.62,6,-.05,{h:true,leg:true}),N(-5,1,.56,6,-.14,{run:true}),N(-2,1,.62,7,-.1,{run:true}),HK(0,4,.82,8,0,[3,7],{leg:true,h:false}),N(-2,2,.62,14,-.05,{h:true,leg:true}),N(-5,1,.56,14,-.14,{run:true}),N(-2,1,.62,15,-.1,{run:true}),HK(0,4,.82,16,0,[5,9],{leg:true,h:true}),N(-2,2,.62,22,-.05,{h:true,leg:true}),N(-7,1,.56,22,-.14,{run:true}),N(-5,1,.62,23,-.1,{run:true}),HK(-2,4,.82,24,0,[4,7],{leg:true,h:false}),N(-5,2,.62,30,-.05,{h:true,leg:true})],32)
      }
    },

    'lalla-lapillo': {
      id:'lalla-lapillo', bpm:82, root:220.00, groove:'volcano', instrument:'mellowLead', gain:.66, tensionStyle:'none',
      filter:1460, delay:.34,
      bus:{ lead:1.14, chorus:1.30, tension:.84, pad:.24, bass:.82, perc:.74, harmony:.56 },
      chords:[[0,4,7,10],[-5,-1,2,7],[-3,0,4,9],[-7,-3,0,5]],
      drum:{ kick:[0,8,11], snare:[6,14], hat:[3,7,10,15], ghost:[12] },
      bass:{
        verse:[N(-24,4,.86),REST,REST,REST,N(-17,2,.70),REST,REST,REST,N(-24,2,.74),REST,REST,REST,REST,REST,N(-21,1,.76),N(-14,1,.72)],
        pre:[N(-24,4,.82),REST,REST,REST,N(-17,2,.74),REST,N(-14,1,.66),REST,N(-24,2,.78),REST,REST,REST,N(-17,1,.70),REST,N(-21,1,.76),N(-14,1,.72)],
        chorus:[N(-24,4,.92),REST,REST,REST,N(-17,2,.78),REST,REST,REST,N(-24,2,.84),REST,REST,N(-17,1,.74),REST,REST,N(-21,1,.80),N(-14,1,.76)],
        bridge:[N(-24,4,.78),REST,REST,REST,N(-17,2,.66),REST,REST,REST,N(-14,3,.68),REST,REST,REST,REST,REST,N(-21,1,.66),N(-24,1,.72)]
      },
      lead:{
        intro:PH([N(5,1,.5,30,-.24,{run:true}),N(6,1,.58,31,-.22,{run:true}),HK(7,4,.7,0,.12,[3],{leg:true,e:true,h:true,stab:true}),HK(10,1,.5,5,0,[2],{run:true,h:true}),HK(7,3,.62,6,.02,[3],{leg:true,h:true,e:true}),HK(7,4,.66,8,.1,[4,7],{leg:true,e:true}),HK(12,4,.72,16,.1,[4,9],{leg:true,e:true,h:true}),HK(9,4,.66,24,.08,[3,8],{leg:true,e:true})],32),
        verse:PH([N(5,1,.46,30,-.24,{run:true}),N(6,1,.54,31,-.22,{run:true}),HK(0,4,.68,0,.12,[4,7,10],{leg:true,e:true,stab:true}),HK(10,1,.46,5,.02,[2],{run:true,h:true}),HK(7,3,.6,6,.04,[3],{leg:true,h:true}),HK(7,4,.64,8,.1,[4,7],{leg:true,e:true}),HK(12,4,.7,16,.1,[4,9],{leg:true,h:true}),N(10,1,.48,22,-.1,{run:true}),HK(9,4,.64,24,.08,[3,8],{leg:true,e:true})],32),
        pre:PH([N(5,1,.52,30,-.24,{run:true}),N(6,1,.6,31,-.22,{run:true}),HK(7,4,.76,0,.1,[3],{leg:true,e:true,h:true,stab:true}),HK(7,4,.7,8,.1,[4,7],{leg:true,e:true}),HK(12,5,.82,16,.1,[4,9],{leg:true,h:true,e:true}),N(10,1,.56,22,-.1,{run:true}),HK(9,4,.72,24,.08,[3,8],{leg:true,e:true})],32),
        chorus:PH([HK(7,4,1,0,.1,[3],{stab:true,accent:true,leg:true,e:true}),HK(10,1,.72,5,0,[2],{run:true,h:true}),HK(7,3,.86,6,.02,[3],{leg:true,h:true,e:true}),HK(7,4,.9,8,.1,[4,7],{leg:true,e:true}),N(5,1,.7,14,-.25,{run:true}),N(6,1,.82,15,-.25,{run:true}),HK(12,4,1,16,.1,[4,9],{stab:true,h:true,e:true}),N(10,1,.72,22,-.1,{run:true}),HK(9,4,.88,24,.06,[3,8],{leg:true,e:true}),N(5,1,.7,30,-.25,{run:true}),N(6,1,.82,31,-.25,{run:true}),HK(7,4,1,32,.1,[3],{stab:true,accent:true,leg:true,e:true}),HK(10,1,.72,37,0,[2],{run:true,h:true}),HK(7,3,.86,38,.02,[3],{leg:true,h:true,e:true}),HK(7,4,.9,40,.1,[4,7],{leg:true,e:true}),N(5,1,.7,46,-.25,{run:true}),N(6,1,.82,47,-.25,{run:true}),N(12,1,.76,48,0,{run:true}),N(10,1,.74,50,-.1,{run:true}),N(7,1,.74,52,-.1,{run:true}),HK(5,5,.9,56,.06,[4,7],{stab:true,leg:true,e:true}),N(5,1,.7,62,-.25,{run:true}),N(6,1,.82,63,-.25,{run:true})],64),
        bridge:PH([N(5,1,.46,30,-.24,{run:true}),N(6,1,.54,31,-.22,{run:true}),HK(0,5,.66,0,.12,[4,7,10],{leg:true,e:true,stab:true}),HK(7,4,.6,8,.1,[4,7],{leg:true,e:true}),HK(9,4,.66,16,.1,[3,7],{leg:true,h:true}),N(10,1,.5,22,-.1,{run:true}),HK(5,5,.64,24,.08,[4,7],{leg:true,e:true})],32)
      }
    },

    'orbo-granito': {
      id:'orbo-granito', bpm:70, root:174.61, groove:'ruins', instrument:'mellowLead', gain:.60, tensionStyle:'none',
      filter:980, delay:.40,
      bus:{ lead:1.02, chorus:1.18, tension:.80, pad:.30, bass:.76, perc:.48, harmony:.55 },
      chords:[[0,3,7,10],[-5,-2,2,7],[-7,-3,0,5],[-2,0,3,7]],
      drum:{ kick:[0,8,11], snare:[5,13], hat:[3,7,10,15], ghost:[14] },
      bass:{
        verse:[N(-24,2,.78),REST,N(-26,1,.64),N(-21,2,.78),REST,N(-17,2,.72),REST],
        pre:[N(-24,1,.76),REST,N(-21,1,.70),REST,N(-17,2,.78),REST,N(-14,1,.66),REST],
        chorus:[N(-24,1,.84),N(-21,1,.74),REST,N(-17,2,.80),REST,N(-14,1,.70),N(-17,2,.76),REST],
        bridge:[N(-31,2,.68),REST,N(-27,2,.70),REST,N(-24,2,.82),REST]
      },
      lead:{
        intro:PH([HK(0,5,.72,0,0,[3,7],{leg:true,e:false}),HK(-2,5,.72,8,0,[4,9],{leg:true,e:true}),HK(0,5,.72,16,0,[5,9],{leg:true,e:false}),HK(0,5,.72,24,0,[3,7],{leg:true,e:true})],32),
        verse:PH([HK(0,5,.72,0,0,[3,7],{leg:true,e:false}),HK(-2,5,.72,8,0,[4,9],{leg:true,e:true}),HK(0,5,.72,16,0,[5,9],{leg:true,e:false}),HK(0,5,.72,24,0,[3,7],{leg:true,e:true})],32),
        pre:PH([HK(7,5,.72,0,0,[5,3],{leg:true,e:false}),HK(7,5,.72,8,0,[3,7],{leg:true,e:true}),HK(5,5,.72,16,0,[4,7],{leg:true,e:false}),HK(7,5,.72,24,0,[5,3],{leg:true,e:true})],32),
        chorus:PH([HK(0,6,.82,0,0,[3,7],{stab:true,e:true}),N(3,.5,.58,5,0,{run:true}),N(5,.5,.6,6,-.25,{run:true}),N(7,.5,.66,7,0,{run:true}),HK(7,4,.84,8,0,[3],{leg:true,h:true}),HK(5,5,.76,16,0,[7],{leg:true,e:true}),N(5,.5,.54,21,0,{run:true}),N(7,.5,.58,22,-.25,{run:true}),N(10,.5,.62,23,0,{run:true}),HK(0,5,.76,24,0,[3,7],{leg:true}),HK(0,6,.8,32,0,[3,7],{stab:true,e:true}),N(3,.5,.56,37,0,{run:true}),N(5,.5,.58,38,-.25,{run:true}),N(7,.5,.64,39,0,{run:true}),HK(7,4,.82,40,0,[3],{leg:true,h:true}),HK(9,4,.84,48,0,[3,8],{stab:true,accent:true}),HK(0,6,.78,56,0,[3,7],{leg:true,e:true})],64),
        bridge:PH([HK(-5,5,.72,0,0,[5,3],{leg:true,e:false}),HK(-5,5,.72,8,0,[3,7],{leg:true,e:true}),HK(-3,5,.72,16,0,[3,8],{leg:true,e:false}),HK(-5,5,.72,24,0,[5,3],{leg:true,e:true})],32)
      }
    },

    'zelda-quarzo': {
      id:'zelda-quarzo', bpm:104, root:261.63, groove:'crystal', instrument:'softKalimba', gain:.74, highTension:true, tensionStyle:'crystalRush',
      filter:1980, delay:.19,
      bus:{ lead:1.14, chorus:1.32, tension:1.34, pad:.16, bass:.82, perc:.82, harmony:.58 },
      chords:[[0,4,7,11],[-1,2,6,9],[-5,-1,2,6],[-7,-3,0,4]],
      drum:{ kick:[0,6,8,12], snare:[4,10,14], hat:[1,3,5,7,9,11,13,15], ghost:[2] },
      bass:{
        verse:[N(-24,1,.82),N(-17,1,.72),REST,N(-13,1,.76),REST,N(-12,1,.78),N(-13,1,.70),REST,N(-17,2,.74)],
        pre:[N(-24,1,.82),REST,N(-17,1,.76),N(-12,1,.80),N(-10,1,.72),REST,N(-12,2,.78),REST],
        chorus:[N(-24,1,.90),N(-17,1,.82),N(-12,1,.84),N(-5,1,.78),REST,N(-10,1,.74),N(-12,1,.82),REST,N(-17,1,.76)],
        bridge:[N(-18,1,.74),N(-17,1,.76),REST,N(-13,2,.78),REST,N(-12,2,.80),REST]
      },
      lead:{
        intro:PH([N(12,4,.68,0,0,{leg:true}),N(14,3,.48,8,0,{leg:true}),N(18,4,.60,16,0,{leg:true}),N(9,3,.44,24,0,{leg:true})],32),
        verse:PH([N(12,5,.72,0,0,{leg:true}),N(14,3,.50,8,0,{leg:true}),N(18,4,.62,16,0,{leg:true}),N(9,3,.46,24,0,{leg:true})],32),
        pre:PH([N(19,4,.70,0,0,{leg:true}),N(18,3,.50,8,0,{leg:true}),N(18,4,.64,16,0,{leg:true}),N(17,3,.48,24,0,{leg:true})],32),
        chorus:PH([N(12,5,.82,0,0,{leg:true}),N(14,3,.62,8,0,{leg:true}),N(18,4,.78,16,0,{leg:true}),N(9,3,.58,24,0,{leg:true}),N(12,5,.80,32,0,{leg:true}),N(14,3,.60,40,0,{leg:true}),N(19,4,.84,48,0,{leg:true,accent:true}),N(12,5,.78,56,0,{leg:true})],64),
        bridge:PH([N(11,4,.62,0,0,{leg:true}),N(9,3,.44,8,0,{leg:true}),N(11,4,.58,16,0,{leg:true}),N(9,3,.42,24,0,{leg:true})],32)
      }
    },

    'prof-ossidiana': {
      id:'prof-ossidiana', bpm:106, root:196.00, groove:'blackboard', instrument:'warmKeys', gain:.74, highTension:true, tensionStyle:'logicPanic',
      filter:1950, delay:.11,
      bus:{ lead:1.15, chorus:1.38, tension:1.52, pad:.14, bass:.84, perc:.96, harmony:.48 },
      chords:[[0,3,6,10],[-5,-2,1,6],[-3,0,3,7],[-7,-4,0,6]],
      drum:{ kick:[0,3,8,10,14], snare:[4,12], hat:[1,2,5,6,9,11,13,15], ghost:[7] },
      bass:{
        verse:[N(-24,1,.84),REST,N(-23,1,.70),N(-18,1,.76),REST,N(-21,1,.72),N(-24,1,.82),REST,N(-17,1,.70)],
        pre:[N(-24,1,.84),N(-18,1,.72),REST,N(-14,1,.76),N(-17,1,.72),REST,N(-21,2,.76),REST],
        chorus:[N(-18,1,.88),N(-17,1,.78),N(-14,1,.84),REST,N(-12,1,.78),N(-14,1,.78),N(-17,1,.74),N(-18,1,.82)],
        bridge:[N(-28,1,.70),N(-24,1,.80),N(-18,2,.82),REST,N(-21,1,.72),N(-23,2,.70),REST]
      },
      lead:{
        intro:PH([HK(6,3,.78,0,0,[4,6],{stab:true,leg:true}),N(7,2,.62,4,-.05,{h:true,leg:true}),N(1,1,.52,6,-.14,{run:true}),N(3,1,.58,7,-.1,{run:true}),HK(6,3,.78,8,0,[4,7],{stab:false,leg:true}),N(7,2,.62,12,-.05,{h:true,leg:true}),N(3,1,.52,14,-.14,{run:true}),N(6,1,.58,15,-.1,{run:true}),HK(7,3,.78,16,0,[5,2],{stab:false,leg:true}),N(10,2,.62,20,-.05,{h:true,leg:true}),N(1,1,.52,22,-.14,{run:true}),N(3,1,.58,23,-.1,{run:true}),HK(6,3,.78,24,0,[6,2],{stab:false,leg:true}),N(7,2,.62,28,-.05,{h:true,leg:true})],32),
        verse:PH([HK(3,3,.78,0,0,[3,7],{stab:true,leg:true}),N(6,2,.62,4,-.05,{h:true,leg:true}),N(-2,1,.52,6,-.14,{run:true}),N(0,1,.58,7,-.1,{run:true}),HK(1,3,.78,8,0,[5,6],{stab:false,leg:true}),N(3,2,.62,12,-.05,{h:true,leg:true}),N(0,1,.52,14,-.14,{run:true}),N(1,1,.58,15,-.1,{run:true}),HK(3,3,.78,16,0,[4,6],{stab:false,leg:true}),N(6,2,.62,20,-.05,{h:true,leg:true}),N(1,1,.52,22,-.14,{run:true}),N(3,1,.58,23,-.1,{run:true}),HK(5,3,.78,24,0,[3,7],{stab:false,leg:true}),N(6,2,.62,28,-.05,{h:true,leg:true})],32),
        pre:PH([HK(6,3,.78,0,0,[4,6],{stab:true,leg:true}),N(7,2,.62,4,-.05,{h:true,leg:true}),N(1,1,.52,6,-.14,{run:true}),N(3,1,.58,7,-.1,{run:true}),HK(6,3,.78,8,0,[4,7],{stab:false,leg:true}),N(7,2,.62,12,-.05,{h:true,leg:true}),N(3,1,.52,14,-.14,{run:true}),N(6,1,.58,15,-.1,{run:true}),HK(7,3,.78,16,0,[5,2],{stab:false,leg:true}),N(10,2,.62,20,-.05,{h:true,leg:true}),N(1,1,.52,22,-.14,{run:true}),N(3,1,.58,23,-.1,{run:true}),HK(6,3,.78,24,0,[6,2],{stab:false,leg:true}),N(7,2,.62,28,-.05,{h:true,leg:true})],32),
        chorus:PH([N(6,1,.9,0,0,{leg:true}),N(5,1,.78,2,-.25,{run:true}),N(3,1,.78,4,0,{leg:true}),N(6,1,.9,8,0,{leg:true}),N(5,1,.78,10,-.25,{run:true}),N(3,1,.78,12,0,{leg:true}),N(6,1,.9,16,0,{leg:true}),N(5,1,.78,18,-.25,{run:true}),N(3,1,.78,20,0,{leg:true}),HK(0,4,1,24,0,[6,12],{stab:true,accent:true,e:true}),N(6,1,.78,32,0,{leg:true}),N(5,1,.7,34,-.25,{run:true}),N(3,1,.7,36,0,{leg:true}),HK(6,4,.86,40,0,[4],{leg:true,h:true}),HK(7,4,.88,48,0,[5,8],{stab:true,accent:true}),HK(0,5,.82,56,0,[6,12],{leg:true,e:true})],64),
        bridge:PH([HK(0,3,.78,0,0,[6,3],{stab:true,leg:true}),N(1,2,.62,4,-.05,{h:true,leg:true}),N(-2,1,.52,6,-.14,{run:true}),N(0,1,.58,7,-.1,{run:true}),HK(1,3,.78,8,0,[5,6],{stab:false,leg:true}),N(3,2,.62,12,-.05,{h:true,leg:true}),N(0,1,.52,14,-.14,{run:true}),N(1,1,.58,15,-.1,{run:true}),HK(0,3,.78,16,0,[3,7],{stab:false,leg:true}),N(6,2,.62,20,-.05,{h:true,leg:true}),N(-5,1,.52,22,-.14,{run:true}),N(-2,1,.58,23,-.1,{run:true}),HK(0,3,.78,24,0,[5,6],{stab:false,leg:true}),N(1,2,.62,28,-.05,{h:true,leg:true})],32)
      }
    },

    imperio: {
      id:'imperio', bpm:90, root:196.00, groove:'camp', instrument:'bossBrassSynth', gain:.76, highTension:true, tensionStyle:'finalMarch',
      filter:1380, delay:.25,
      // V37.14X: Imperio balance — meno note alte/brass, più groove/bassline/percussioni.
      bus:{ lead:1.04, chorus:1.18, tension:1.36, pad:.18, bass:1.16, perc:.95, harmony:.44 },
      chords:[[0,3,7,12],[-7,-3,0,7],[-5,-2,2,7],[-2,0,3,10]],
      drum:{ kick:[0,4,8,12], snare:[6,14], hat:[2,6,10,14], ghost:[11] },
      bass:{
        verse:[N(-24,2,.90),REST,N(-31,2,.78),REST,N(-24,1,.88),N(-17,2,.86),REST,N(-24,1,.84)],
        pre:[N(-24,1,.88),REST,N(-17,1,.78),N(-12,2,.86),REST,N(-17,1,.76),N(-24,2,.86)],
        chorus:[N(-24,1,1.08),N(-17,1,.94),N(-12,2,1.02),N(-9,2,.99),REST,N(-12,1,.94),N(-17,1,.90),N(-24,2,1.00)],
        bridge:[N(-36,2,.74),REST,N(-31,2,.82),REST,N(-27,1,.78),N(-24,2,.88),REST]
      },
      lead:{
        intro:PH([HK(0,4,.82,0,0,[3,7],{stab:true,leg:true,accent:true}),N(-2,2,.62,5,-.05,{h:true,leg:true}),HK(0,4,.82,8,0,[5,7],{stab:false,leg:true,accent:false}),N(-2,2,.62,13,-.05,{h:true,leg:true}),HK(2,4,.82,16,0,[5,8],{stab:false,leg:true,accent:false}),N(0,2,.62,21,-.05,{h:true,leg:true}),HK(0,4,.82,24,0,[3,10],{stab:false,leg:true,accent:false}),N(-2,2,.62,29,-.05,{h:true,leg:true})],32),
        verse:PH([HK(0,4,.82,0,0,[3,7],{stab:true,leg:true,accent:true}),N(-2,2,.62,5,-.05,{h:true,leg:true}),HK(0,4,.82,8,0,[5,7],{stab:false,leg:true,accent:false}),N(-2,2,.62,13,-.05,{h:true,leg:true}),HK(2,4,.82,16,0,[5,8],{stab:false,leg:true,accent:false}),N(0,2,.62,21,-.05,{h:true,leg:true}),HK(0,4,.82,24,0,[3,10],{stab:false,leg:true,accent:false}),N(-2,2,.62,29,-.05,{h:true,leg:true})],32),
        pre:PH([HK(7,4,.82,0,0,[5,8],{stab:true,leg:true,accent:true}),N(5,2,.62,5,-.05,{h:true,leg:true}),HK(7,4,.82,8,0,[5,2],{stab:false,leg:true,accent:false}),N(5,2,.62,13,-.05,{h:true,leg:true}),HK(10,4,.82,16,0,[4,9],{stab:false,leg:true,accent:false}),N(7,2,.62,21,-.05,{h:true,leg:true}),HK(10,4,.82,24,0,[5,2],{stab:false,leg:true,accent:false}),N(7,2,.62,29,-.05,{h:true,leg:true})],32),
        chorus:PH([HK(0,5,.96,0,0,[3,7],{stab:true,accent:true,h:true,e:false}),HK(7,4,.88,8,0,[5,2],{stab:false,accent:false,h:false,e:false}),N(10,2,.58,13,-.04,{h:true,leg:true}),HK(-5,5,.88,16,0,[3,7],{stab:false,accent:false,h:false,e:true}),HK(10,4,.88,24,0,[5,2],{stab:false,accent:false,h:true,e:false}),N(12,2,.58,29,-.04,{h:true,leg:true}),HK(0,5,.88,32,0,[3,7],{stab:true,accent:false,h:false,e:false}),HK(9,4,.88,40,0,[3,8],{stab:false,accent:false,h:false,e:false}),N(10,2,.58,45,-.04,{h:true,leg:true}),HK(7,4,.96,48,0,[3,7],{stab:true,accent:true,h:true,e:false}),N(3,1,.56,52,-.08,{run:true}),N(5,2,.62,53,-.04,{leg:true}),HK(0,5,.88,56,0,[3,10],{stab:false,accent:false,h:false,e:true})],64),
        bridge:PH([HK(-5,4,.82,0,0,[5,8],{stab:true,leg:true,accent:true}),N(-7,2,.62,5,-.05,{h:true,leg:true}),HK(-7,4,.82,8,0,[4,7],{stab:false,leg:true,accent:false}),N(-9,2,.62,13,-.05,{h:true,leg:true}),HK(-5,4,.82,16,0,[3,7],{stab:false,leg:true,accent:false}),N(-7,2,.62,21,-.05,{h:true,leg:true}),HK(-9,4,.82,24,0,[7,9],{stab:false,leg:true,accent:false}),N(-10,2,.62,29,-.05,{h:true,leg:true})],32)
      }
    }
  };

  const FORM = ['intro','verse','pre','chorus','verse','pre','bridge','chorus','chorus'];

  const Music = {
    ctx:null, master:null, filter:null, delay:null, delayGain:null, out:null,
    musicOut:null, delayOut:null, glueSend:null, glueComp:null, glueTone:null, glueReturn:null,
    warmBus:null, cleanBus:null, debugAnalyser:null, debugTimeData:null, debugFreqData:null,
    noiseCache:null, noiseCacheMax:18,
    buses:null, sends:null, warm:null, limiter:null, timer:null, stopTimer:null, lifecycleSerial:0, mode:'idle',
    preset:PRESETS.menu, tension:false, step:0, nextTime:0, pressureSmooth:0,
    lookAhead:.74, scheduleEveryMs:86
  };

  function num(v,f){ const n=Number(v); return Number.isFinite(n)?n:f; }
  function effMusicVol(){ return typeof getEffectiveMusicVolumeValue === 'function' ? getEffectiveMusicVolumeValue() : 1; }
  function section(){ return FORM[Math.floor(Music.step/32) % FORM.length]; }
  function localStep(){ return Music.step % 16; }
  function phraseLoopSteps(phrase){ return Math.max(16, Number(phrase && phrase.loopSteps) || 16); }
  function phraseStep(phrase){ return Music.step % phraseLoopSteps(phrase); }
  function hasPhraseTimeline(phrase){
    if(!Array.isArray(phrase)) return false;
    for(let i=0;i<phrase.length;i++){ if(phrase[i] && typeof phrase[i].s === 'number') return true; }
    return false;
  }
  function phraseEventsForCurrentStep(phrase){
    if(!Array.isArray(phrase) || !hasPhraseTimeline(phrase)) return null;
    const s = phraseStep(phrase);
    const out = [];
    for(let i=0;i<phrase.length;i++){
      const ev = phrase[i];
      if(ev && typeof ev.s === 'number' && (ev.s % phraseLoopSteps(phrase)) === s) out.push(ev);
    }
    return out;
  }
  function chord(){ const c=Music.preset.chords || PRESETS.menu.chords; return c[Math.floor(Music.step/8) % c.length] || c[0]; }

  // V37.15A: una sola regola dinamica coerente.
  // La pressione musicale aumenta morbida mentre i sassi diminuiscono: niente stacchi bruschi.
  function battlePressureTarget(){
    try{
      if(Music.mode !== 'battle' || !window.GameState || !Array.isArray(GameState.board) || typeof countRemainingStones !== 'function') return 0;
      const remaining = countRemainingStones(GameState.board);
      const rows = Array.isArray(GameState.configRows) ? GameState.configRows : [];
      const total = rows.reduce((sum,n)=>sum+(Number(n)||0),0) || Math.max(remaining,15);
      return Math.max(0, Math.min(1, (total - remaining) / Math.max(1, total - 1)));
    }catch(_){ return 0; }
  }
  function battlePressure(){
    const target = battlePressureTarget();
    Music.pressureSmooth = (Music.pressureSmooth || 0) + (target - (Music.pressureSmooth || 0)) * 0.08;
    return Music.pressureSmooth || 0;
  }
  function beat(){
    const pressureBpm = battlePressure() * 7.0;
    return 60 / Math.max(50, Math.min(142, num(Music.preset.bpm,76) + (Music.tension ? 8 : 0) + pressureBpm));
  }
  function freq(semi){ return Math.max(24, (Music.preset.root || 220) * Math.pow(2, semi / 12)); }
  function makeWarmCurve(amount){
    const k = typeof amount === 'number' ? amount : 0.30;
    const samples = 2048;
    const curve = new Float32Array(samples);
    for(let i=0;i<samples;i++){
      const x = (i * 2 / samples) - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  function ensureGraph(){
    if(!window.GameState || !GameState.audioEnabled) return false;
    if((!window.AudioKit || !AudioKit.ctx) && typeof resumeAudio === 'function') resumeAudio();
    if(!window.AudioKit || !AudioKit.ctx) return false;
    const ctx = AudioKit.ctx;
    if(Music.ctx === ctx && Music.master && Music.buses) return true;

    Music.ctx = ctx;
    Music.master = ctx.createGain();
    // V37.14W: split warm architecture.
    // Warm solo su lead/harmony/pad; bass/perc/tension restano lineari per ridurre IMD.
    Music.warmBus = ctx.createGain();
    Music.cleanBus = ctx.createGain();
    Music.warm = ctx.createWaveShaper();
    Music.limiter = ctx.createDynamicsCompressor();
    Music.filter = ctx.createBiquadFilter();
    Music.delay = ctx.createDelay(1.6);
    Music.delayGain = ctx.createGain();
    // V37.14Q: la musica non entra più nel compressor globale degli effetti.
    // Mantiene la sua catena musicale interna, poi esce diretta e stabile.
    Music.out = ctx.destination;
    Music.musicOut = ctx.createGain();
    Music.delayOut = ctx.createGain();
    // V37.14U: glue parallelo solo-musica.
    // Il segnale principale resta diretto; qui entra solo una copia morbida e molto bassa.
    Music.glueSend = ctx.createGain();
    Music.glueComp = ctx.createDynamicsCompressor();
    Music.glueTone = ctx.createBiquadFilter();
    Music.glueReturn = ctx.createGain();

    Music.master.gain.setValueAtTime(.0001, ctx.currentTime);
    Music.warmBus.gain.setValueAtTime(1.0, ctx.currentTime);
    Music.cleanBus.gain.setValueAtTime(1.0, ctx.currentTime);
    Music.warm.curve = makeWarmCurve(0.28);
    Music.warm.oversample = '4x';

    Music.limiter.threshold.setValueAtTime(-10, ctx.currentTime);
    Music.limiter.knee.setValueAtTime(14, ctx.currentTime);
    Music.limiter.ratio.setValueAtTime(2.6, ctx.currentTime);
    Music.limiter.attack.setValueAtTime(.006, ctx.currentTime);
    Music.limiter.release.setValueAtTime(.20, ctx.currentTime);

    Music.filter.type = 'lowpass';
    Music.filter.frequency.setValueAtTime(1350, ctx.currentTime);
    Music.filter.Q.setValueAtTime(.54, ctx.currentTime);
    Music.delay.delayTime.setValueAtTime(.24, ctx.currentTime);
    Music.delayGain.gain.setValueAtTime(.12, ctx.currentTime);
    Music.musicOut.gain.setValueAtTime(.92, ctx.currentTime);
    Music.delayOut.gain.setValueAtTime(.62, ctx.currentTime);
    Music.glueSend.gain.setValueAtTime(.18, ctx.currentTime);
    // Compressione parallela leggera: colla, non schiacciamento del mix principale.
    Music.glueComp.threshold.setValueAtTime(-20, ctx.currentTime);
    Music.glueComp.knee.setValueAtTime(18, ctx.currentTime);
    Music.glueComp.ratio.setValueAtTime(1.75, ctx.currentTime);
    Music.glueComp.attack.setValueAtTime(.020, ctx.currentTime);
    Music.glueComp.release.setValueAtTime(.240, ctx.currentTime);
    Music.glueTone.type = 'lowpass';
    Music.glueTone.frequency.setValueAtTime(5200, ctx.currentTime);
    Music.glueTone.Q.setValueAtTime(.32, ctx.currentTime);
    Music.glueReturn.gain.setValueAtTime(.095, ctx.currentTime);

    // V37.14W: analyser diagnostico non invasivo, scollegato dall'uscita.
    Music.debugAnalyser = ctx.createAnalyser();
    Music.debugAnalyser.fftSize = 2048;
    Music.debugAnalyser.smoothingTimeConstant = .82;
    Music.debugTimeData = new Uint8Array(Music.debugAnalyser.fftSize);
    Music.debugFreqData = new Uint8Array(Music.debugAnalyser.frequencyBinCount);
    Music.noiseCache = Music.noiseCache || Object.create(null);

    Music.buses = {};
    Music.sends = {};
    ['lead','harmony','bass','pad','perc','tension'].forEach((name) => {
      const g = ctx.createGain();
      const s = ctx.createGain();
      g.gain.setValueAtTime(.4, ctx.currentTime);
      s.gain.setValueAtTime(name === 'lead' || name === 'harmony' ? .10 : .035, ctx.currentTime);
      // V37.14W: bass/perc/tension bypassano il waveshaper seriale per evitare IMD.
      // Lead, harmony e pad mantengono il calore originale.
      if(name === 'lead' || name === 'harmony' || name === 'pad') g.connect(Music.warmBus);
      else g.connect(Music.cleanBus);
      // Niente coda pesante su bassi/percussioni: groove più leggibile e meno impasto.
      if(name !== 'bass' && name !== 'perc') g.connect(s);
      s.connect(Music.delay);
      Music.buses[name] = g;
      Music.sends[name] = s;
    });

    Music.warmBus.connect(Music.warm);
    Music.warm.connect(Music.master);
    Music.cleanBus.connect(Music.master);
    // V37.14Y: filtro prima del limiter. Il limiter torna a essere il guardiano finale del ramo seriale.
    Music.master.connect(Music.filter);
    Music.filter.connect(Music.limiter);
    Music.limiter.connect(Music.musicOut);
    Music.musicOut.connect(Music.out);
    // Il glue resta parallelo e leggero, ma viene alimentato post-limiter per evitare boost post-filtro.
    Music.limiter.connect(Music.glueSend);
    Music.glueSend.connect(Music.glueComp);
    Music.glueComp.connect(Music.glueTone);
    Music.glueTone.connect(Music.glueReturn);
    Music.glueReturn.connect(Music.out);
    Music.delay.connect(Music.delayGain);
    Music.delayGain.connect(Music.delayOut);
    Music.delayOut.connect(Music.out);
    if(Music.debugAnalyser) {
      Music.musicOut.connect(Music.debugAnalyser);
      Music.glueReturn.connect(Music.debugAnalyser);
      Music.delayOut.connect(Music.debugAnalyser);
    }
    return true;
  }

  function ramp(param, val, dur){
    if(!param || !Music.ctx) return;
    const t=Music.ctx.currentTime, d=Math.max(.03, num(dur,.5));
    try{ param.cancelScheduledValues(t); param.setTargetAtTime(val, t, Math.max(.012, d/3)); }
    catch(e){ try{ param.value = val; }catch(_){} }
  }

  function setBusLevels(){
    if(!Music.buses) return;
    const b = Music.preset.bus || {};
    const tensionMul = Music.tension ? 1.0 : .64;
    ramp(Music.buses.lead.gain, num(b.lead,1.05), .30);
    ramp(Music.buses.harmony.gain, num(b.harmony,.50), .30);
    ramp(Music.buses.bass.gain, num(b.bass,.70), .30);
    ramp(Music.buses.pad.gain, num(b.pad,.28), .30);
    ramp(Music.buses.perc.gain, num(b.perc,.48), .30);
    ramp(Music.buses.tension.gain, num(b.tension,.90) * tensionMul, .30);

    if(Music.sends){
      ramp(Music.sends.lead.gain, Music.tension ? .06 : .10, .30);
      ramp(Music.sends.harmony.gain, .10, .30);
      ramp(Music.sends.pad.gain, Music.tension ? .025 : .07, .30);
      ramp(Music.sends.perc.gain, Music.tension ? .020 : .016, .30);
      ramp(Music.sends.tension.gain, Music.tension ? .030 : .010, .30);
    }
  }

  function targetGain(){
    if(Music.mode === 'idle') return .0001;
    const sceneGain = Music.mode === 'menu' ? .88 : (Music.mode === 'story-world' ? .78 : 1.0);
    return Math.min(1.56, num(Music.preset.gain,.62) * effMusicVol() * sceneGain * (Music.tension ? 1.05 : 1));
  }

  function applyTone(){
    if(!Music.ctx) return;
    ramp(Music.filter.frequency, num(Music.preset.filter,1350) + (Music.tension ? 240 : -150), .40);
    ramp(Music.filter.Q, Music.tension ? .72 : .50, .40);
    ramp(Music.delay.delayTime, num(Music.preset.delay,.25) * (Music.tension ? .84 : 1), .40);
    ramp(Music.delayGain.gain, Music.tension ? .070 : .105, .40);
    if(Music.glueSend) ramp(Music.glueSend.gain, Music.tension ? .145 : .18, .40);
    if(Music.glueReturn) ramp(Music.glueReturn.gain, Music.tension ? .075 : .095, .40);
    if(Music.glueTone) ramp(Music.glueTone.frequency, Music.tension ? 4400 : 5600, .40);
    setBusLevels();
  }

  function pitchGain(freqValue){
    if(freqValue > 1800) return .46;
    if(freqValue > 1350) return .58;
    if(freqValue > 1000) return .70;
    if(freqValue > 760) return .82;
    return 1.0;
  }

  function connectToBus(gain, busName){
    const bus = Music.buses && Music.buses[busName] ? Music.buses[busName] : Music.master;
    gain.connect(bus);
  }

  function osc(f,t,d,g,type,opt,busName){
    if(!Music.ctx || !Music.master) return;
    const ctx=Music.ctx, o=ctx.createOscillator(), ga=ctx.createGain(), fi=ctx.createBiquadFilter(), op=opt||{};
    const busTarget = busName || 'lead';
    const melodicBus = busTarget === 'lead' || busTarget === 'harmony' || busTarget === 'tension';

    if(melodicBus){
      g *= (0.96 + Math.random() * 0.06);
      if(type === 'square') type = 'triangle';
      if(type === 'sawtooth') type = 'triangle';
      g *= pitchGain(f);
    }

    o.type=type || 'sine';
    o.frequency.setValueAtTime(Math.max(24,f),t);
    if(op.detune) o.detune.setValueAtTime(op.detune,t);
    else if(melodicBus) o.detune.setValueAtTime(Math.random()*4-2,t);
    if(op.endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(24,op.endFreq),t+d*.92);

    fi.type=op.filterType || 'lowpass';
    fi.frequency.setValueAtTime(op.filterFreq || 1500,t);
    fi.Q.setValueAtTime(op.q || .65,t);

    ga.gain.setValueAtTime(.0001,t);
    ga.gain.exponentialRampToValueAtTime(Math.max(.0002,g),t+Math.max(.018,d*(op.attack||.060)));
    ga.gain.exponentialRampToValueAtTime(.0001,t+d);

    o.connect(fi); fi.connect(ga); connectToBus(ga, busTarget);
    o.start(t); o.stop(t+d+.08);
  }

  function noiseBuf(d){
    const ctx = Music.ctx;
    if(!ctx) return null;
    // V37.14Y: cache sicura dei buffer noise, per ridurre memory churn su mobile.
    // Bucket da 10 ms: conserva il carattere percussivo senza rigenerare buffer ad ogni colpo.
    const bucket = Math.max(1, Math.round((Number(d)||.08) * 100));
    const key = String(bucket);
    Music.noiseCache = Music.noiseCache || Object.create(null);
    if(Music.noiseCache[key]) return Music.noiseCache[key];

    const len=Math.max(1,Math.floor(ctx.sampleRate*(bucket/100))), b=ctx.createBuffer(1,len,ctx.sampleRate), data=b.getChannelData(0);
    for(let i=0;i<len;i++){ const fade=1-i/len; data[i]=(Math.random()*2-1)*Math.pow(fade,1.75); }

    const keys = Object.keys(Music.noiseCache);
    if(keys.length >= (Music.noiseCacheMax || 18)) delete Music.noiseCache[keys[0]];
    Music.noiseCache[key] = b;
    return b;
  }

  function noise(t,d,g,f,opt,busName){
    if(!Music.ctx || !Music.master) return;
    const ctx=Music.ctx, s=ctx.createBufferSource(), ga=ctx.createGain(), fi=ctx.createBiquadFilter(), op=opt||{};
    const nb = noiseBuf(d);
    if(!nb) return;
    s.buffer=nb;
    fi.type=op.filterType || 'bandpass';
    fi.frequency.setValueAtTime(f||1600,t);
    fi.Q.setValueAtTime(op.q||2,t);
    ga.gain.setValueAtTime(.0001,t);
    ga.gain.exponentialRampToValueAtTime(Math.max(.0002,g),t+.018);
    ga.gain.exponentialRampToValueAtTime(.0001,t+d);
    s.connect(fi); fi.connect(ga); connectToBus(ga, busName || 'perc');
    s.start(t); s.stop(t+d+.05);
  }

  function playInstrument(semi,t,dur,gain,busName,role){
    const instrument = Music.preset.instrument || 'warmKeys';
    const f = freq(semi);
    const b = beat();
    const targetBus = busName || 'lead';

    if(instrument === 'softKalimba'){
      osc(f,t,dur*.72,gain*.78,'triangle',{attack:.030,filterFreq:1450,q:.72},targetBus);
      osc(f*2.01,t+b*.015,dur*.45,gain*.25,'sine',{attack:.020,filterFreq:2200,q:.55},'harmony');
      noise(t,dur*.11,gain*.045,2400,{filterType:'bandpass',q:2.3},'harmony');
      return;
    }

    if(instrument === 'woodMallet'){
      osc(f,t,dur*.78,gain*.76,'triangle',{attack:.026,filterFreq:1150,q:.78},targetBus);
      osc(f*.5,t+b*.010,dur*.92,gain*.28,'sine',{attack:.040,filterFreq:650,q:.58},'harmony');
      noise(t,dur*.10,gain*.040,1150,{filterType:'bandpass',q:1.7},'harmony');
      return;
    }

    if(instrument === 'mellowLead'){
      osc(f,t,dur,gain*.70,'sine',{attack:.070,filterFreq:1500,q:.52},targetBus);
      osc(f*1.003,t,dur*.96,gain*.42,'triangle',{attack:.075,filterFreq:1350,q:.50,detune:3},'harmony');
      return;
    }

    if(instrument === 'bossBrassSynth'){
      const highSoft = f > 620 ? .82 : 1.0;
      osc(f,t,dur,gain*.74*highSoft,'triangle',{attack:.095,filterFreq:1180,q:.58},targetBus);
      osc(f*.5,t,dur*1.05,gain*.38,'sine',{attack:.105,filterFreq:780,q:.48},'harmony');
      osc(f*1.5,t+b*.018,dur*.82,gain*.115,'sine',{attack:.115,filterFreq:900,q:.30},'harmony');
      return;
    }

    osc(f,t,dur,gain*.70,'triangle',{attack:.062,filterFreq:1500,q:.58},targetBus);
    osc(f*1.006,t,dur*.94,gain*.34,'sine',{attack:.070,filterFreq:1250,q:.50,detune:4},'harmony');
  }

  function schedulePad(ch,t,sec){
    if(Music.step % 8 !== 0) return;
    if(sec === 'intro' && Music.step % 16 !== 0) return;
    const b=beat(), dur=b*(sec === 'bridge' ? 5.5 : 7.0);
    ch.forEach((semi,i)=>{
      osc(freq(semi+(i===0?-12:0)), t+i*.018, dur, (i===0?.012:.016), 'sine', {attack:.30, filterFreq:Music.tension?1180:880, q:.46, detune:(Math.random()*4-2)}, 'pad');
    });
  }

  // V37.15G: presenza ritmica controllata per preset.
  // Recupera bassline + percussioni senza toccare master/DSP/limiter.
  function groovePresence(){
    const id = (Music.preset && Music.preset.id) || '';
    const g = (Music.preset && Music.preset.groove) || '';
    const m = { bass:1.22, harm:1.42, kick:1.28, snare:1.24, hat:1.14, ghost:1.18, fill:1.18 };

    if(g === 'quarry'){ m.bass=1.34; m.harm=1.58; m.kick=1.36; m.snare=1.32; m.hat=1.10; m.ghost=1.22; }
    if(g === 'forge'){ m.bass=1.28; m.harm=1.52; m.kick=1.30; m.snare=1.34; m.hat=1.22; m.ghost=1.25; }
    if(g === 'crystal'){ m.bass=1.18; m.harm=1.46; m.kick=1.22; m.snare=1.20; m.hat=1.30; m.ghost=1.18; }
    if(g === 'ravine'){ m.bass=1.28; m.harm=1.50; m.kick=1.26; m.snare=1.22; m.hat=1.12; m.ghost=1.20; }
    if(g === 'ruins'){ m.bass=1.30; m.harm=1.45; m.kick=1.34; m.snare=1.14; m.hat=1.08; m.ghost=1.24; }
    if(g === 'blackboard'){ m.bass=1.20; m.harm=1.44; m.kick=1.20; m.snare=1.28; m.hat=1.24; m.ghost=1.22; }
    if(g === 'camp'){ m.bass=1.15; m.harm=1.30; m.kick=1.12; m.snare=1.12; m.hat=1.06; m.ghost=1.10; m.fill=1.10; }

    if(id === 'mara-selce'){ m.bass*=1.10; m.harm*=1.08; m.kick*=1.06; }
    if(id === 'bruno-basalto'){ m.bass*=1.10; m.harm*=1.08; m.kick*=1.06; m.snare*=1.05; }
    if(id === 'teo-pietrafocaia'){ m.snare*=1.08; m.hat*=1.08; m.ghost*=1.08; }
    if(id === 'zelda-quarzo'){ m.hat*=1.10; m.harm*=1.06; }
    if(id === 'orbo-granito'){ m.kick*=1.10; m.ghost*=1.12; m.hat*=.96; }
    if(id === 'prof-ossidiana'){ m.snare*=1.08; m.hat*=1.10; m.ghost*=1.08; }
    if(id === 'imperio'){ m.bass*=1.00; m.harm*=1.00; m.kick*=.96; m.snare*=.96; m.hat*=.94; m.ghost*=.96; m.fill*=.96; }

    return m;
  }

  function scheduleBassRiff(t,sec){
    const phrase = (Music.preset.bass && (Music.preset.bass[sec] || Music.preset.bass.verse)) || [];
    const ev = phrase[localStep()];
    if(!ev) return;
    const b=beat();
    const dur=b*Math.max(.35,ev.d||1)*.90;
    const semi=ev.n;
    const mix=groovePresence();
    // V37.15I: low-end control. Presenza sì, ma meno sub cumulativo sui downbeat.
    // La leggibilità viene spostata su mid-bass/armonica, non su più fondamentale.
    const gain=.056*(ev.a||1)*mix.bass;
    osc(freq(semi),t,dur,gain,'sine',{attack:.030,filterFreq:Music.tension?640:420,q:.60},'bass');
    if(localStep()%2===0) osc(freq(semi+12),t+b*.012,dur*.70,gain*.29*mix.harm,'triangle',{attack:.034,filterFreq:860,q:.44},'bass');
    // Il pluck +24 non cade più sempre sui downbeat: evita somma con kick/sub.
    if(localStep()%8===4) osc(freq(semi+24),t+b*.020,dur*.32,gain*.070*mix.harm,'triangle',{attack:.020,filterFreq:1180,q:.35},'bass');
  }

  function scheduleLeadEvent(ev,t,sec,currentStep,isTimeline){
    if(!ev) return;
    const b=beat(), g=Music.preset.groove;
    let semi=ev.n;
    let dur=b*Math.max(.28,ev.d||1)*(isTimeline ? .96 : .92);
    let gain=.037*(ev.a||1);
    let busName='lead';

    if(isTimeline){
      if(sec === 'chorus') {
        gain *= (g === 'camp' ? .94 : 1.08);
        busName = Music.tension ? 'tension' : 'lead';
      }
      if(sec === 'pre') gain *= 1.02;
      if(sec === 'bridge') gain *= .96;
      if(g === 'quarry') dur *= .86;
      if(g === 'ravine' || g === 'ruins') dur *= 1.12;
      if(g === 'blackboard') dur *= .82;
      if(g === 'camp') dur *= 1.06;
      if(Music.tension) gain *= (Music.preset && Music.preset.id === 'imperio' ? .90 : 1.00);

      // V37.15D: run/legato = mano che scorre, meno attacco secco, più overlap.
      if(ev.run === true) { dur *= 1.42; gain *= .88; }
      else if(ev.leg === true) { dur *= 1.24; gain *= .93; }
      if(ev.accent === true) gain *= 1.10;

      const shift = typeof ev.g === 'number' ? ev.g : 0;
      const fireTime = Math.max((Music.ctx ? Music.ctx.currentTime + .004 : t), t + b*shift + b*.020);
      playInstrument(semi,fireTime,dur,gain,busName,'lead');

      // V37.15C: accordi/dyad/stab nei punti forti dell'hook, leggeri e sul bus harmony.
      if(Array.isArray(ev.ch) && ev.ch.length) {
        const stabDur = dur * (ev.stab ? .34 : .52);
        const stabGain = gain * (ev.stab ? .135 : .092);
        for(let ci=0; ci<ev.ch.length; ci++){
          const intv = Number(ev.ch[ci]);
          if(Number.isFinite(intv)) {
            osc(freq(semi + intv), fireTime + b*(.012 + ci*.006), stabDur, stabGain/(ci+1), ci===0?'triangle':'sine', {attack:.035, filterFreq:980 + ci*210, q:.38}, 'harmony');
          }
        }
      }

      // Controcanto moderato, solo sui punti principali: arricchisce senza riempire troppo.
      if(sec === 'chorus' && (currentStep % 8 === 0 || ev.h === true)) {
        osc(freq(semi-12), fireTime + b*.018, dur*.70, gain*.14, 'sine', {attack:.080, filterFreq:840, q:.42}, 'harmony');
      }
      if(ev.e === true) playInstrument(semi,fireTime + b*.52,dur*.34,gain*.12,'harmony','echo');
      return;
    }

    if(sec === 'chorus') {
      gain *= (g === 'camp' ? .88 : 1.10);
      busName = Music.tension ? 'tension' : 'lead';
      if(g !== 'crystal') semi += (g === 'camp' ? 10 : 12);
    }
    if(sec === 'pre') gain *= 1.02;
    if(sec === 'bridge') gain *= .96;
    if(g === 'quarry') dur *= .72;
    if(g === 'ravine' || g === 'ruins') dur *= 1.22;
    if(g === 'blackboard') dur *= .62;
    if(g === 'crystal') { semi += 10; gain *= .78; dur *= .76; }
    if(g === 'camp') dur *= 1.12;
    if(Music.tension) gain *= (Music.preset && Music.preset.id === 'imperio' ? .92 : 1.02);

    playInstrument(semi,t + b*.025,dur,gain,busName,'lead');

    if(sec === 'chorus' || (Music.tension && localStep()%4===0)) {
      osc(freq(semi-12), t + b*.035, dur*.78, gain*.20, 'sine', {attack:.075, filterFreq:900, q:.48}, 'harmony');
    }

    if(sec === 'chorus' && (localStep() === 0 || localStep() === 4 || localStep() === 8)){
      playInstrument(semi,t + b*.56,dur*.38,gain*.16,'harmony','echo');
    }
  }

  function scheduleLead(t,sec){
    const phrase = (Music.preset.lead && (Music.preset.lead[sec] || Music.preset.lead.verse)) || [];
    const timelineEvents = phraseEventsForCurrentStep(phrase);
    if(timelineEvents){
      const currentStep = phraseStep(phrase);
      for(let i=0;i<timelineEvents.length;i++) scheduleLeadEvent(timelineEvents[i],t,sec,currentStep,true);
      return;
    }
    const ev = phrase[localStep()];
    scheduleLeadEvent(ev,t,sec,localStep(),false);
  }

  function isIn(arr, x){ return Array.isArray(arr) && arr.indexOf(x) >= 0; }

  function crystalTransientSoft(){
    return (Music.preset && (Music.preset.id === 'zelda-quarzo' || Music.preset.groove === 'crystal' || Music.preset.tensionStyle === 'crystalRush')) ? .62 : 1.00;
  }

  function softKick(t,b,gain){
    // V37.15I: meno sub/body, click più morbido. Il punch resta, il gracchio no.
    const c=crystalTransientSoft();
    osc(freq(-36),t,b*.28,gain*1.06,'sine',{attack:.008,filterFreq:250,q:.50,endFreq:freq(-44)},'perc');
    osc(freq(-24),t+b*.006,b*.080,gain*.40,'triangle',{attack:.006,filterFreq:560,q:.38,endFreq:freq(-31)},'perc');
    noise(t,b*.032,gain*.20*c,1160,{filterType:'bandpass',q:1.45},'perc');
  }

  function softSnare(t,b,gain){
    // V37.15I: snap highpass controllato, specialmente per crystal/Zelda.
    const c=crystalTransientSoft();
    noise(t,b*.155,gain*1.04,1180,{filterType:'bandpass',q:1.10},'perc');
    noise(t+b*.008,b*.058,gain*.30*c,2450,{filterType:'highpass',q:1.45},'perc');
    osc(freq(-17),t,b*.120,gain*.36,'triangle',{attack:.010,filterFreq:560,q:.40},'perc');
  }

  function softHat(t,b,gain){
    // V37.15I: hat più rotondo; il secondo morso non deve sembrare click rotto.
    const c=crystalTransientSoft();
    noise(t,b*.070,gain*1.05*c,3850,{filterType:'highpass',q:1.85},'perc');
    noise(t+b*.014,b*.034,gain*.30*c,5850,{filterType:'highpass',q:1.20},'perc');
  }

  function scheduleDrums(t,sec){
    const d=Music.preset.drum || {}, s=localStep(), b=beat();
    let mul = sec === 'chorus' ? 1.18 : (sec === 'bridge' ? .88 : 1);
    if(Music.tension) mul *= 1.22;
    if(Music.preset && Music.preset.id === 'imperio') mul *= 1.16;

    const mix=groovePresence();
    if(isIn(d.kick,s)) softKick(t,b,.028*mul*mix.kick);
    if(isIn(d.snare,s)) softSnare(t,b,.021*mul*mix.snare);
    if(isIn(d.hat,s)) softHat(t,b,.0090*mul*mix.hat);
    if(isIn(d.ghost,s)) softSnare(t,b,.0090*mul*mix.ghost);

    // Transition fill at the end of every 16-step phrase, still on-grid.
    if((s === 14 || s === 15) && sec !== 'intro'){
      const c=crystalTransientSoft();
      noise(t,b*.090,.0085*mul*mix.fill,1850 + s*110,{filterType:'bandpass',q:1.25},'perc');
      noise(t+b*.045,b*.045,.0042*mul*mix.fill*c,3300,{filterType:'highpass',q:1.35},'perc');
    }
  }

  function scheduleExtremeTension(t,sec){
    if(!Music.tension) return;
    const style = Music.preset.tensionStyle;
    const s = Music.step, b = beat();

    if(style === 'crystalRush'){
      const arp = [0, 7, 11, 14, 19, 14, 11, 7];
      const semi = arp[s % arp.length] + 10;
      osc(freq(semi), t, b*.25, .0125, 'sine', {attack:.026, filterFreq:2350, q:.52}, 'tension');
      if(s%4===2) noise(t,b*.085,.0035,3000,{filterType:'highpass',q:1.45},'tension');
    }

    if(style === 'logicPanic'){
      const seq = [0, 1, 6, 3, 10, 6, 1, 7];
      const semi = seq[s % seq.length] + (s%4===3 ? 12 : 0);
      if(s%2===0 || s%8===3) osc(freq(semi+12), t, b*.17, .020, 'triangle', {attack:.018, filterFreq:2400, q:1.1}, 'tension');
      noise(t+b*.05,b*.06,.007,3300,{filterType:'highpass',q:4.0},'tension');
    }

    if(style === 'finalMarch'){
      const march = [0, -7, 0, 3, 7, 3, 0, -12];
      const semi = march[s % march.length] - 23;
      if(s%2===0) osc(freq(semi), t, b*.88, .033, 'sine', {attack:.058, filterFreq:410, q:.42}, 'tension');
      if(s%4===0) playInstrument(semi+32,t+b*.03,b*.58,.0145,'tension','brass');
      if(s%4===2) noise(t,b*.18,.0080,560,{filterType:'bandpass',q:.50},'perc');
    }
  }

  // All musical layers for a step use the same scheduler tick t; no random timing drift between melody and accompaniment.
  function scheduleStep(t){
    const sec=section(), ch=chord();
    schedulePad(ch,t,sec);
    scheduleBassRiff(t,sec);
    scheduleDrums(t,sec);
    scheduleLead(t,sec);
    scheduleExtremeTension(t,sec);
    Music.step=(Music.step+1)%288;
  }

  function scheduler(){
    if(!Music.ctx || !Music.master || Music.mode==='idle') return;
    if(!window.GameState || !GameState.audioEnabled){ fadeOut(.25,true); return; }
    if(Music.ctx.state !== 'running') return;
    const d=beat()/2;
    while(Music.nextTime < Music.ctx.currentTime + Music.lookAhead){
      scheduleStep(Music.nextTime);
      Music.nextTime += d;
    }
  }

  function startTimer(){ if(!Music.timer) Music.timer=window.setInterval(scheduler,Music.scheduleEveryMs); }
  function stopTimer(){ if(Music.timer){ window.clearInterval(Music.timer); Music.timer=null; } }
  function getPreset(op){ const id=op&&op.id?String(op.id):''; return PRESETS[id] || PRESETS.menu; }
  function highTension(op){ return !!((op && Number(op.skill)>=7) || getPreset(op).highTension); }

  function playMode(mode,preset,opts){
    const o=opts||{};
    if(!ensureGraph()) return false;
    Music.lifecycleSerial+=1;
    if(Music.stopTimer){ window.clearTimeout(Music.stopTimer); Music.stopTimer=null; }
    Music.mode=mode;
    Music.preset=preset || PRESETS.menu;
    Music.tension=!!o.tension;
    Music.step=0;
    Music.pressureSmooth=0;
    Music.nextTime=Music.ctx.currentTime+.05;
    applyTone();
    applyVolume();
    startTimer();
    ramp(Music.master.gain,targetGain(),o.fadeIn||1);
    return true;
  }

  function startMenu(o){ return playMode('menu',PRESETS.menu,{fadeIn:(o&&o.fadeIn)||1.15,tension:false}); }

  function startStory(o){ return playMode('story-world',PRESETS.menu,{fadeIn:(o&&o.fadeIn)||1.05,tension:false}); }

  function startBattle(op,o){
    const current=op || (typeof getCurrentOpponent==='function'?getCurrentOpponent():null);
    const p=getPreset(current);
    return playMode('battle',p,{fadeIn:(o&&o.fadeIn)||1.05,tension:highTension(current)});
  }

  function updateBattle(op){
    if(Music.mode!=='battle') return false;
    const current=op || (typeof getCurrentOpponent==='function'?getCurrentOpponent():null);
    const t=highTension(current);
    if(t!==Music.tension){
      Music.tension=t;
      applyTone();
      applyVolume();
      ramp(Music.master.gain,targetGain(),.50);
    }
    return true;
  }

  function fadeOut(d,stop){
    if(!Music.ctx || !Music.master) return;
    const dur=Math.max(.05,Number(d)||.75);
    ramp(Music.master.gain,.0001,dur);
    if(stop && !Music.stopTimer){
      const serial=++Music.lifecycleSerial;
      Music.stopTimer=window.setTimeout(()=>{
        if(serial!==Music.lifecycleSerial) return;
        Music.stopTimer=null;
        Music.mode='idle';
        stopTimer();
      },Math.ceil(dur*1000)+80);
    }
  }

  function fadeOutForFanfare(d){ fadeOut(d||.85,true); }
  function stopNow(){ fadeOut(.08,true); }

  function syncFromScreen(id){
    if(id==='boot-screen') return;
    if(id==='menu-screen') startMenu({fadeIn:1});
    else if(id==='game-screen') startBattle(null,{fadeIn:.9});
    else if(id==='result-screen' || id==='champion-screen') fadeOutForFanfare(.65);
  }

  function applyVolume(){
    if(Music.ctx && Music.master) ramp(Music.master.gain,targetGain(),.18);
    if(Music.ctx && Music.musicOut) ramp(Music.musicOut.gain,.96,.18);
    if(Music.ctx && Music.delayOut) ramp(Music.delayOut.gain, Music.tension ? .52 : .60, .18);
    setBusLevels();
  }

  function avgBand(freqData, sampleRate, fromHz, toHz){
    if(!freqData || !freqData.length || !sampleRate) return 0;
    const nyq = sampleRate / 2;
    const len = freqData.length;
    const a = Math.max(0, Math.floor((fromHz / nyq) * len));
    const b = Math.min(len - 1, Math.ceil((toHz / nyq) * len));
    if(b < a) return 0;
    let sum = 0, count = 0;
    for(let i = a; i <= b; i++){ sum += freqData[i] || 0; count++; }
    return count ? +(sum / (count * 255)).toFixed(4) : 0;
  }

  function audioDebugSnapshot(){
    const s = status();
    if(!Music.debugAnalyser || !Music.debugTimeData || !Music.debugFreqData || !Music.ctx) {
      s.debugReady = false;
      return s;
    }
    Music.debugAnalyser.getByteTimeDomainData(Music.debugTimeData);
    Music.debugAnalyser.getByteFrequencyData(Music.debugFreqData);
    let peak = 0, sumSq = 0, hot = 0;
    for(let i = 0; i < Music.debugTimeData.length; i++){
      const v = (Music.debugTimeData[i] - 128) / 128;
      const a = Math.abs(v);
      if(a > peak) peak = a;
      if(a >= .98) hot++;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, Music.debugTimeData.length));
    s.debugReady = true;
    s.debugPeak = +peak.toFixed(4);
    s.debugRms = +rms.toFixed(4);
    s.debugHotSamples = hot;
    s.debugSampleRate = Music.ctx.sampleRate || 0;
    s.debugBands = {
      sub: avgBand(Music.debugFreqData, Music.ctx.sampleRate, 20, 60),
      bass: avgBand(Music.debugFreqData, Music.ctx.sampleRate, 60, 180),
      lowMid: avgBand(Music.debugFreqData, Music.ctx.sampleRate, 180, 700),
      mid: avgBand(Music.debugFreqData, Music.ctx.sampleRate, 700, 2200),
      high: avgBand(Music.debugFreqData, Music.ctx.sampleRate, 2200, 7000),
      air: avgBand(Music.debugFreqData, Music.ctx.sampleRate, 7000, 12000)
    };
    s.debugWarning = peak >= .985 ? 'near-digital-peak' : (rms > .42 ? 'high-rms' : '');
    return s;
  }

  function status(){
    return {
      version:'V37.15K-lalla-soul-masterpiece',
      mode:Music.mode,
      preset:Music.preset&&Music.preset.id,
      instrument:Music.preset&&Music.preset.instrument,
      section:section(),
      groove:Music.preset&&Music.preset.groove,
      tension:Music.tension,
      tensionStyle:Music.preset&&Music.preset.tensionStyle,
      musicVolume:effMusicVol(),
      ctxState:Music.ctx?Music.ctx.state:'',
      warmRouting:'lead/harmony/pad',
      cleanRouting:'bass/perc/tension',
      analyserReady:!!Music.debugAnalyser,
      limiterOrder:'filter-before-limiter',
      noiseCacheSize:Music.noiseCache?Object.keys(Music.noiseCache).length:0,
      lifecycle:'managed-in-audio-js',
      schedulerActive:!!Music.timer,
      stopPending:!!Music.stopTimer,
      lifecycleSerial:Music.lifecycleSerial,
      phraseEngine:'timeline-64-retrocompat',
      battlePressure:+(Music.pressureSmooth||0).toFixed(4)
    };
  }

  window.audioDebug = function audioDebug(log){
    const snap = audioDebugSnapshot();
    if(log && console && console.table) {
      console.table({
        preset:snap.preset,
        groove:snap.groove,
        tension:snap.tension,
        peak:snap.debugPeak,
        rms:snap.debugRms,
        hotSamples:snap.debugHotSamples,
        warning:snap.debugWarning,
        sub:snap.debugBands && snap.debugBands.sub,
        bass:snap.debugBands && snap.debugBands.bass,
        mid:snap.debugBands && snap.debugBands.mid,
        high:snap.debugBands && snap.debugBands.high,
        air:snap.debugBands && snap.debugBands.air
      });
    } else if(log && console) {
      console.log('[audioDebug]', snap);
    }
    return snap;
  };

  window.SassiMusic={startMenu,startStory,startBattle,updateBattle,fadeOut,fadeOutForFanfare,stopNow,syncFromScreen,applyVolume,status,presets:PRESETS,debug:audioDebugSnapshot};
  window.startProceduralMenuMusic=startMenu;
  window.startProceduralStoryMusic=startStory;
  window.startProceduralBattleMusic=startBattle;
  window.updateProceduralBattleMusic=updateBattle;
  window.fadeOutProceduralMusicForFanfare=fadeOutForFanfare;
  window.stopProceduralMusic=stopNow;
})();
