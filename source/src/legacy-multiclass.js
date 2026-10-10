/*
 * Multi-section import guard (6.10.6).
 * "الرقم" in the traditional per-class result sheet is a row ordinal, not
 * an academic student ID. Genuine identifiers require an explicit ID header.
 * Sections and repeated table headers must never silently discard pupils.
 */
SR63.importOfficialStudentId=function(value,header){
  const normalized=ij(header??'');
  // Academic/student identifiers must be unambiguous. A column simply headed
  // "الرقم" is the numbering 1..N that restarts in each class.
  const official=['الرقم الأكاديمي','رقم الطالب','student id','studentid','student number','student no','student_id','student number id','رقم أكاديمي','الرقم المدرسي'];
  if(official.some(label=>ij(label)===normalized))return C9(value);
  // Official school exports also name the ID column simply «الرقم».
  // A long numeric ID is safe to distinguish from a 1..N row ordinal.
  // Never use a short «الرقم» value as an academic ID.
  if(normalized===ij('الرقم')&&/^\d{8,18}$/.test(C9(value)))return C9(value);
  return '';
};
/* The worksheet may put a new section caption anywhere in a merged/title row.
 * This must be evaluated BEFORE inheriting the preceding pupil's class. */
SR63.importSectionLabel=function(value,previousClass=''){
  const original=C9(value).trim();if(!original)return '';
  const direct=lj(original);
  if(D9(direct))return direct.replace(/^(\d+)\/(0+)(\d+)$/,(all,g,z,n)=>`${Number(g)}/${Number(n)}`);
  const text=direct.replace(/[\u200e\u200f\u202a-\u202e]/g,'');
  // A labelled title ("الشعبة: 07/2", "طلاب الصف 7/2"), not a person's name.
  const caption=/(?:شعبه|الشعبة|الصف|الفصل|section|class|grade|طلاب|طالبات|كشف|نتايج|نتائج)/i.test(text);
  if(!caption)return '';
  const gradeSection=text.match(/(\d{1,2})\s*[\/\-]\s*(\d{1,2}|ESE)(?![\d\/])/i);
  if(gradeSection){const candidate=`${Number(gradeSection[1])}/${/^ese$/i.test(gradeSection[2])?'ESE':Number(gradeSection[2])}`;return D9(candidate)?candidate:'';}
  // "الشعبة الثانية" / "الشعبة 2" with the grade known from earlier rows.
  const sectionWord=text.match(/(?:الشعبة|شعبه|الفصل|section)\s*[:\-]?\s*(\d{1,2})$/i);
  if(sectionWord&&D9(previousClass)){const candidate=`${previousClass.split('/')[0]}/${Number(sectionWord[1])}`;return D9(candidate)?candidate:'';}
  return '';
};
/* Some official XLSX exports contain real student cells far below a stale
 * worksheet <dimension> value (e.g. !ref=A1:CV5 but 160 students are at
 * rows 4..163). SheetJS loaded the cells but sheet_to_json cut off every
 * row past the false dimension. Rebuild a tight range from nonblank cells.
 * Only change a worksheet's range; do not mutate cells, scores or metadata.
 */
SR63.repairWorksheetRanges=function(book){
  const repaired=[];
  for(const sheetName of book.SheetNames){
    const sheet=book.Sheets[sheetName];if(!sheet)continue;
    let minR=Infinity,minC=Infinity,maxR=-1,maxC=-1;
    for(const [address,cell] of Object.entries(sheet)){
      if(!/^[A-Z]{1,3}[1-9]\d{0,6}$/.test(address)||!cell||cell.t==='z'||cell.v===undefined||cell.v===null||String(cell.v).trim()==='')continue;
      const pos=Gv.decode_cell(address);
      if(pos.r>1048575||pos.c>16383)continue;
      if(pos.r<minR)minR=pos.r;if(pos.r>maxR)maxR=pos.r;
      if(pos.c<minC)minC=pos.c;if(pos.c>maxC)maxC=pos.c;
    }
    if(maxR<0)continue;
    const previous=sheet['!ref']??'';
    let valid=false;
    try{const range=Gv.decode_range(previous);valid=range.s.r<=minR&&range.s.c<=minC&&range.e.r>=maxR&&range.e.c>=maxC;}catch(_){}
    if(valid)continue;
    // Guard against pathological/out-of-bounds cells instead of attempting
    // to allocate a huge rectangular matrix during Excel parsing.
    if((maxR-minR+1)*(maxC-minC+1)>2000000)throw new Error(`نطاق بيانات كبير أو تالف في ورقة ${sheetName}.`);
    const current=Gv.encode_range({s:{r:minR,c:minC},e:{r:maxR,c:maxC}});
    sheet['!ref']=current;
    repaired.push({sheet:sheetName,previous,current});
  }
  return repaired;
};
SR63.readLegacyWorkbook=function(book,fileName,settings){
  const parsed=srLegacyImport(book,fileName,settings),aliases=settings.importAliases??QA;
  const equalAlias=(value,names)=>names.some(name=>ij(name)===ij(value));
  for(const sheet of parsed.sheets){
    // An entirely blank exam column must be reported as not recorded, not
    // treated as an error that blocks valid results in the other subjects.
    if(!sheet.scoreColumns.length){
      const worksheet=book.Sheets[sheet.sheet];
      const matrix=Gv.sheet_to_json(worksheet,{header:1,raw:true,defval:null,blankrows:true});
      const header=(matrix[sheet.headerRow-1]??[]).map(C9);
      const recognized=header.some(value=>/(منتصف|نهاية|الفصل|الاختبار|التقييم)/.test(value));
      if(recognized){
        sheet.selected=false;
        sheet.issues=sheet.issues.filter(issue=>!(/لم أجد عمود درجات صالح/.test(issue.message)));
        sheet.issues.push({severity:'warning',row:sheet.headerRow,sheet:sheet.sheet,message:'لا توجد درجات أو حالات مرصودة لهذه المادة؛ استُبعدت من اعتماد الدرجات مع الحفاظ على بقية المواد. ستظل النتائج غير المرصودة فارغة وليست صفرًا.'});
        continue;
      }
    }
    const worksheet=book.Sheets[sheet.sheet];
    const matrix=Gv.sheet_to_json(worksheet,{header:1,raw:true,defval:null,blankrows:true});
    const headerIndex=sheet.headerRow-1,headers=matrix[headerIndex]??[];
    const findHeader=(values,names)=>values.findIndex(h=>equalAlias(h,names));
    let nameCol=findHeader(headers,aliases.studentName),classCol=findHeader(headers,aliases.className),idCol=findHeader(headers,aliases.studentId);
    if(nameCol<0||classCol<0)continue;
    let idLabel=idCol<0?'':C9(headers[idCol]);
    const existing=new Map(sheet.rows.map(row=>[row.sourceRow,row]));
    const checked=[],warnings=[],errors=[],repairedRows=new Set(),headingRows=new Set();
    const cellValue=(values,row,col)=>{
      if(col<0)return '';
      const raw=values[col],rawText=C9(raw);
      if(D9(lj(rawText)))return rawText;
      // Excel occasionally auto-converts 7/2 into a date serial. Prefer the
      // displayed text ONLY in the class column, never in a score/ID column.
      if(typeof raw==='number'&&raw>20000){
        const cell=worksheet[Gv.encode_cell({r:row,c:col})];
        if(cell?.w&&D9(lj(cell.w)))return String(cell.w);
      }
      return rawText;
    };
    let inheritedClass='',lastOrdinal=null,previousWasGap=false;
    for(let index=headerIndex+1;index<matrix.length;index++){
      const values=matrix[index]??[],sourceRow=index+1;
      const newNameCol=findHeader(values,aliases.studentName),newClassCol=findHeader(values,aliases.className);
      // Blocks can repeat their headers and may move columns in a single file.
      if(newNameCol>=0&&newClassCol>=0){
        nameCol=newNameCol;classCol=newClassCol;idCol=findHeader(values,aliases.studentId);
        idLabel=idCol<0?'':C9(values[idCol]);
        headingRows.add(sourceRow);previousWasGap=true;continue;
      }
      const name=C9(values[nameCol]),rawClass=cellValue(values,index,classCol);
      const rawNumber=idCol>=0?C9(values[idCol]):'';
      const rowHasGrades=sheet.scoreColumns.some(column=>C9(values[column.index])!=='');
      // A caption may sit in A1:D1 or the student-name column rather than the
      // dedicated class column. Do not treat such captions as student records.
      const candidateMarkers=[];
      for(let col=0;col<values.length;col++){
        const text=cellValue(values,index,col);
        const candidate=SR63.importSectionLabel(text,inheritedClass);
        if(candidate)candidateMarkers.push({col,className:candidate});
      }
      const nameIsMarker=!!SR63.importSectionLabel(name,inheritedClass);
      const nameIsCaption=/^(?:الشعبة|الشعبه|شعبه|الصف|الفصل|الصفوالشعبة|section|class|grade)$/i.test(ij(name));
      const looksLikeSection=(!name||nameIsMarker||nameIsCaption||equalAlias(name,aliases.studentName))&&(!rowHasGrades||nameIsMarker);
      if(looksLikeSection&&candidateMarkers.length){
        const distinct=[...new Set(candidateMarkers.map(marker=>marker.className))];
        if(distinct.length===1){inheritedClass=distinct[0];lastOrdinal=null;previousWasGap=false;headingRows.add(sourceRow);continue;}
        errors.push({severity:'error',row:sourceRow,sheet:sheet.sheet,message:`عنوان المجموعة يحتوي أكثر من شعبة متعارضة (${distinct.join('، ')}). صحح العنوان قبل الاستيراد.`});
        inheritedClass='';headingRows.add(sourceRow);previousWasGap=true;continue;
      }
      if(!name){if(values.some(cell=>C9(cell)))previousWasGap=true;continue;}
      if(equalAlias(name,aliases.studentName)){headingRows.add(sourceRow);previousWasGap=true;continue;}
      // Never silently assign another class after a serial-number restart.
      const ordinal=/^\d+$/.test(rawNumber)?Number(rawNumber):null;
      if(ordinal===1&&lastOrdinal!==null&&lastOrdinal>1&&!rawClass&&inheritedClass){
        errors.push({severity:'error',row:sourceRow,sheet:sheet.sheet,message:`بدأ تسلسل طلاب جديد بعد الرقم ${lastOrdinal} دون تحديد شعبة واضحة. لا يمكن إلحاق هؤلاء بالشعبة ${inheritedClass} تلقائيًا.`});
        inheritedClass='';
      }
      const directClass=SR63.importSectionLabel(rawClass,inheritedClass);
      if(rawClass&&!directClass){
        errors.push({severity:'error',row:sourceRow,sheet:sheet.sheet,message:`صيغة الشعبة «${rawClass}» غير مفهومة للطالب «${name}».`});
      }
      const exactClass=directClass||(!rawClass?inheritedClass:'');
      if(!exactClass||!D9(exactClass)){
        errors.push({severity:'error',row:sourceRow,sheet:sheet.sheet,message:`لا يمكن تحديد الشعبة للطالب «${name}» (صف Excel ${sourceRow})؛ أُوقف اعتماد الملف بدل إسقاط الطالب أو نسبته لشعبة خاطئة.`});
        lastOrdinal=ordinal;previousWasGap=false;continue;
      }
      if(directClass)inheritedClass=directClass;
      let entry=existing.get(sourceRow);
      if(!entry){
        const scoreValues={};
        for(const column of sheet.scoreColumns){
          const raw=values[column.index],score=T9(raw),status=E9(raw,score!==null,settings);
          scoreValues[column.key]={score,status:status.status,raw:C9(raw),recognized:status.recognized};
        }
        entry={id:`${fileName}-${sheet.sheet}-${sourceRow}`,studentId:'',studentName:name,grade:uj(exactClass),className:exactClass,sourceRow,values:scoreValues};
        repairedRows.add(sourceRow);
      }
      if(!rawClass){
        warnings.push({severity:'warning',row:sourceRow,sheet:sheet.sheet,message:`الشعبة ${exactClass} للطالب «${name}» موروثة من عنوان المجموعة السابق.`});
      }
      entry.className=exactClass;entry.grade=uj(exactClass);
      entry.studentId=SR63.importOfficialStudentId(rawNumber,idLabel)||SR63.stableStudentId(name,exactClass);
      checked.push(entry);
      if(ordinal!==null)lastOrdinal=ordinal;
      previousWasGap=false;
    }
    sheet.rows=checked;
    sheet.detectedClasses=[...new Set(checked.map(row=>row.className))];
    sheet.sourceStudentRows=checked.length+new Set(errors.filter(x=>/الطالب/.test(x.message)).map(x=>x.row)).size;
    sheet.issues=sheet.issues.filter(issue=>!headingRows.has(issue.row)&&!(repairedRows.has(issue.row)&&/تجاهل صف ناقص|تجاهل صف بلا|الشعبة/.test(issue.message)));
    sheet.issues.push(...warnings,...errors);
    if(!sheet.rows.length&&!sheet.issues.some(issue=>issue.severity==='error'))sheet.issues.push({severity:'error',row:0,sheet:sheet.sheet,message:'لم يتم العثور على طلاب صالحين في ورقة النتيجة.'});
  }
  return parsed;
};
