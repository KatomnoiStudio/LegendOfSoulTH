-- redeem_coupon เดิมคืนแค่ public.profiles ทำให้ TS ฝั่ง client ไม่รู้ว่าได้หยกจริงกี่หน่วย
-- (SettingsModal.tsx แสดง toast "แลกโค้ดสำเร็จ ได้หยก +${result.amount}" — ถ้าไม่มีค่าจริงจะ
-- โชว์ +0 ทั้งที่ยอดหยกเพิ่มจริง) เปลี่ยนคืนเป็น jsonb รวม profile + amount ที่แลกได้จริง

drop function if exists public.redeem_coupon(text);

create or replace function public.redeem_coupon(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
  v_code text := upper(trim(p_code));
  v_gem int;
  v_already_redeemed boolean;
begin
  if v_code = 'WELCOME2026' then
    v_gem := 50;
  else
    raise exception 'โค้ดนี้ไม่ถูกต้องหรือหมดอายุแล้ว';
  end if;

  select exists(
    select 1 from public.currency_transactions
    where profile_id = auth.uid() and source = 'coupon' and ref_id = v_code
  ) into v_already_redeemed;

  if v_already_redeemed then
    raise exception 'ใช้โค้ดนี้ไปแล้ว';
  end if;

  insert into public.currency_transactions (profile_id, currency, source, amount, ref_id)
  values (auth.uid(), 'gem', 'coupon', v_gem, v_code);

  update public.profiles set gem = gem + v_gem where id = auth.uid()
  returning * into result;

  return jsonb_build_object('profile', to_jsonb(result), 'amount', v_gem);
end;
$$;
