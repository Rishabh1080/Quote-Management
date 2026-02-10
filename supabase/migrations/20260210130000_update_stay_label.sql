-- Update the label for STAY_MAN_DAYS from "Stay man days" to "Stay"
UPDATE public.additional_costs SET label = 'Stay' WHERE code = 'STAY_MAN_DAYS';
