-- The other half of the chat-unlock sign-off answer: "if suppose user
-- dont want to unlock due to privacy, then after request of seller to
-- user then user will do if Quick replies cant resolve." Rather than a
-- one-off bespoke "request unlock" button, this is exactly what the new
-- admin-manageable quick replies (0033) are for — a seller-only nudge,
-- editable/removable like any other quick reply from here on.
insert into quick_replies (text, for_role, position)
values ('🔓 Please unlock photo sharing so we can continue', 'seller', 6);
