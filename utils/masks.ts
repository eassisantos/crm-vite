
export const maskPhone = (value: string): string => {
  if (!value) return "";
  value = value.replace(/\D/g, '');
  value = value.slice(0, 11);

  if (value.length > 10) {
    // (XX) XXXXX-XXXX
    value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (value.length > 6) {
    // (XX) XXXX-XXXX
    value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (value.length > 2) {
    // (XX) XXXX
    value = value.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
  } else {
    value = value.replace(/^(\d*)/, '($1');
  }
  return value;
};

export const maskCpf = (value: string): string => {
  if (!value) return "";
  value = value.replace(/\D/g, '');
  value = value.slice(0, 11);
  value = value.replace(/(\d{3})(\d)/, '$1.$2');
  value = value.replace(/(\d{3})(\d)/, '$1.$2');
  value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return value;
};

export const maskCep = (value: string): string => {
  if (!value) return "";
  value = value.replace(/\D/g, '');
  value = value.slice(0, 8);
  value = value.replace(/(\d{5})(\d)/, '$1-$2');
  return value;
};
