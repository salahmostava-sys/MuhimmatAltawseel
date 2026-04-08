const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'modules/employees/components/EmployeeTable.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace job_title
const jobTitleSearch = `                      case 'job_title':
                        return (
                          <td key="job_title" className="px-3 py-2.5 text-center whitespace-nowrap">
                            {renderEditableTextCell(emp.id, 'job_title', emp.job_title, {
                              placeholder: 'المسمى الوظيفي',
                            })}
                          </td>
                        );`;
const jobTitleReplace = `                      case 'job_title': {
                        const jobTitleOptions = [
                          { value: '', label: 'بدون تحديد' },
                          ...buildTextOptions(uniqueVals.job_title, emp.job_title),
                        ];
                        return (
                          <td key="job_title" className="px-3 py-2.5 whitespace-nowrap text-center">
                            {permissions.can_edit ? (
                              <InlineSelectEditor
                                value={emp.job_title || ''}
                                options={jobTitleOptions}
                                onSave={(nextValue) => saveField(emp.id, 'job_title', nextValue)}
                                renderDisplay={() => renderTextValue(emp.job_title)}
                              />
                            ) : (
                              renderTextValue(emp.job_title)
                            )}
                          </td>
                        );
                      }`;
content = content.replace(jobTitleSearch, jobTitleReplace);

// Replace commercial_record
const crSearch = `                      case 'commercial_record':
                        return (
                          <td key="commercial_record" className="px-3 py-2.5 text-center whitespace-nowrap">
                            {renderEditableTextCell(emp.id, 'commercial_record', emp.commercial_record, {
                              placeholder: 'السجل التجاري',
                            })}
                          </td>
                        );`;
const crReplace = `                      case 'commercial_record': {
                        const crOptions = [
                          { value: '', label: 'بدون تحديد' },
                          ...buildTextOptions(commercialRecordNames, emp.commercial_record),
                        ];
                        return (
                          <td key="commercial_record" className="px-3 py-2.5 whitespace-nowrap text-center">
                            {permissions.can_edit ? (
                              <InlineSelectEditor
                                value={emp.commercial_record || ''}
                                options={crOptions}
                                onSave={(nextValue) => saveField(emp.id, 'commercial_record', nextValue)}
                                renderDisplay={() => renderTextValue(emp.commercial_record)}
                              />
                            ) : (
                              renderTextValue(emp.commercial_record)
                            )}
                          </td>
                        );
                      }`;
content = content.replace(crSearch, crReplace);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patched correctly');
