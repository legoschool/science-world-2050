"""Exploration records are evidence, never automatic mission completion."""
EVENTS={'discovery.predicted','discovery.trial','discovery.support','discovery.reflection','discovery.transfer'}

def evaluate(config, kind, p):
    answer=p.get('answer',''); reason=p.get('reason','')
    if not isinstance(answer,str) or len(answer)>300 or not isinstance(reason,str) or len(reason)>300:
        raise ValueError('생각은 300자 안으로 적어 주세요.')
    phase=kind.split('.')[-1]
    names={'predicted':'처음 예상','trial':'조건과 관찰','support':'도움 선택','reflection':'생각 돌아보기','transfer':'새 상황 적용'}
    out={'modality':'simulation','taskTitle':config['title']+' / '+names.get(phase,'탐구'),'phase':phase}
    if kind=='discovery.predicted':
        out.update(responseText=answer or '관찰하면서 생각하기',evaluation='ungraded')
    elif kind=='discovery.support':
        labels={'clue':'관찰 단서 보기','explain':'함께 설명 정리하기','focus':'조건 줄이기'}
        if answer not in labels:raise ValueError('도움 선택을 확인해 주세요.')
        out.update(responseText=labels[answer],evaluation='ungraded')
    elif kind=='discovery.reflection':
        labels={'changed':'생각을 바꾸었어요','kept':'근거를 찾아 생각을 유지해요','unsure':'더 확인하고 싶어요'}
        if answer not in labels:raise ValueError('돌아본 생각을 골라 주세요.')
        out.update(responseText=labels[answer]+(' · '+reason if reason else ''),review='teacher_pending',evaluation='ungraded')
    elif kind=='discovery.transfer':
        choices={o['id']:o['label'] for o in config['transfer']['options']}
        if answer not in choices:raise ValueError('새 상황에서 할 일을 골라 주세요.')
        correct=answer==config['transfer']['key']
        out.update(correct=correct,responseText=choices[answer]+(' · '+reason if reason else ''),feedback=config['transfer']['reason'] if correct else '어떤 조건을 확인해야 할까요? 앞의 관찰과 비교해 다시 골라 보세요.')
    elif kind=='discovery.trial':
        r=p.get('roles')
        controls=config['controls']
        if not isinstance(r,dict) or set(r)!={c['id'] for c in controls} or any(r[c['id']] not in [o['id'] for o in c['options']] for c in controls):
            raise ValueError('실험 조건을 다시 확인해 주세요.')
        labels=[c['label']+': '+next(o['label'] for o in c['options'] if o['id']==r[c['id']]) for c in controls]
        k=config['kind'];view={}
        if k=='sun':
            length=(170 if r['sun']=='low' else 60)*(1.5 if r['stick']=='tall' else 1)
            view={'length':length,'height':111 if r['stick']=='tall' else 74,'high':r['sun']=='high'}
            observation='그림자가 바닥에 드리워졌어요. 같은 막대로 해가 낮을 때와 높을 때의 길이를 비교해 보세요.'
            # Descriptive comparison only: screen pixels are not real measurements.
        elif k=='air':
            view={'lit':r['air']=='open' or r['time']=='first','open':r['air']=='open'}
            observation='불꽃이 보여요.' if view['lit'] else '시간이 지나 불꽃이 꺼졌어요.'
        elif k=='circuit':
            view={'lit':r['switch']=='closed' and r['contact']=='side','closed':r['switch']=='closed','contact':r['contact']}
            observation='비상등이 켜져 길이 보여요.' if view['lit'] else '비상등이 아직 꺼져 있어요. 연결된 길을 살펴보세요.'
        elif k=='evidence':
            view={'source':r['source']=='record','fair':r['conditions']=='same','ready':r['source']=='record' and r['conditions']=='same'}
            if view['source']:
                view['oldRecord']='기존 장치: '+('1분' if view['fair'] else '30초')+' 동안 5개'
                view['newRecord']='새 장치: 1분 동안 8개'
                labels.extend([view['oldRecord'],view['newRecord'],'같은 종류의 물건을 분류함'])
            observation='확인한 조건을 붙여 기사를 쓸 근거가 생겼어요.' if view['ready'] else '아직 단정하기 어려워요. 원래 기록과 비교 조건을 함께 살펴보세요.'
        elif k=='insulation':
            value=26 if r['time']=='start' else 17 if r['wall']=='insulated' else 15.5
            view={'temperature':value,'insulated':r['wall']=='insulated'}
            observation=f'모형 자료의 온도는 {value:g} °C예요. 같은 출발 온도에서 시간이 지난 뒤를 비교해 보세요.'
        else:raise ValueError('탐구 장면을 찾을 수 없어요.')
        out.update(view=view,observation=observation,conditionText=' / '.join(labels),responseText=' / '.join(labels)+' → '+observation,evaluation='ungraded')
    else:raise ValueError('탐구 기록을 확인해 주세요.')
    return out
