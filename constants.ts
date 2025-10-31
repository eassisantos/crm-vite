
export const PLACEHOLDER_GROUPS = {
    "Cliente": [
        'name', 'cpf', 'rg', 'rgIssuer', 'rgIssuerUF', 'dataEmissao', 'motherName', 'fatherName', 'dateOfBirth', 'nacionalidade', 'naturalidade', 'estadoCivil', 'profissao', 'email', 'phone', 'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'
    ].map(key => `{{cliente.${key}}}`).sort(),
    "Representante Legal": [
        'name', 'motherName', 'fatherName', 'cpf', 'rg', 'rgIssuer', 'rgIssuerUF', 'dataEmissao', 'dateOfBirth', 'nacionalidade', 'naturalidade', 'estadoCivil', 'profissao', 'email', 'phone', 'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state'
    ].map(key => `{{cliente.legalRepresentative.${key}}}`).sort(),
    "Caso": [
        'caseNumber', 'title', 'nature', 'status', 'startDate', 'benefitType', 'notes'
    ].map(key => `{{caso.${key}}}`).sort(),
    "Escritório": [
        'name', 'oab', 'email', 'phone', 'address'
    ].map(key => `{{escritorio.${key}}}`).sort(),
    "Data Atual": [
        '{{data.hoje}}', // DD/MM/YYYY
        '{{data.hoje_extenso}}' // ex: 25 de julho de 2024
    ].sort()
};
