import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { sha256 } from '@/lib/security/crypto';

type EventRow={created_at:string;event_type:string;event_data?:Record<string,unknown>};
type Input={original:Buffer;documentId:string;documentName:string;signerName:string;signerEmail:string;signedAt:string;originalHash:string;signatureType:'drawn'|'typed';signatureData:string;events:EventRow[];verifyUrl:string};

export async function generateSignedPdf(input:Input){
  const pdf=await PDFDocument.load(input.original,{ignoreEncryption:false});
  const page=pdf.addPage([595.28,841.89]);
  const font=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const {height}=page.getSize(); let y=height-60;
  const text=(s:string,size=10,isBold=false)=>{page.drawText(s,{x:52,y,size,font:isBold?bold:font,color:rgb(.08,.1,.15)});y-=size+8};
  text('ELEKTRONISKT SIGNERAT',18,true); y-=8;
  text(`Dokument: ${clean(input.documentName)}`,11,true);
  text(`Dokument-ID: ${input.documentId}`);
  text(`Signerad av: ${clean(input.signerName)}`);
  text(`E-post: ${clean(input.signerEmail)}`);
  const date=new Date(input.signedAt); text(`Tidpunkt: ${date.toISOString()}`);
  text(`Originalets SHA-256: ${input.originalHash}`,8);
  text(`Verifiering: ${input.verifyUrl}`,8);
  text('Slutlig PDF SHA-256 lagras externt efter att denna PDF skapats.',8);
  y-=10;text('Signatur',12,true);
  if(input.signatureType==='drawn'&&input.signatureData.startsWith('data:image/png;base64,')){
    try{const bytes=Buffer.from(input.signatureData.split(',')[1],'base64');const img=await pdf.embedPng(bytes);const dims=img.scaleToFit(230,90);page.drawImage(img,{x:52,y:y-dims.height,width:dims.width,height:dims.height});y-=dims.height+20}catch{text('[Ritad signatur kunde inte bäddas in]',10)}
  }else{text(clean(input.signatureData).slice(0,100),24);}
  text('Audit trail',12,true);
  for(const ev of input.events.slice(-18)){if(y<70)break;const line=`${new Date(ev.created_at).toISOString()}  ${label(ev.event_type)}`;text(line.slice(0,105),8)}
  page.drawText('Denna sida är ett elektroniskt signeringsbevis. Kontrollera dokument-ID på verifieringssidan.',{x:52,y:35,size:7,font,color:rgb(.35,.4,.48)});
  const bytes=Buffer.from(await pdf.save({useObjectStreams:true}));
  return {bytes,hash:sha256(bytes)};
}
function clean(s:string){return s.replace(/[\r\n\t]/g,' ').replace(/[^\x20-\x7EÀ-ÿ]/g,'?')}
function label(type:string){return ({created:'Dokument skapades',sent:'Dokument skickades',opened:'Signeringslänk öppnades',viewed:'Dokumentet visades',terms_accepted:'Villkoren accepterades',signed:'Dokumentet signerades',final_pdf_generated:'Slutlig PDF genererades',rejected:'Dokumentet avvisades',reminder_sent:'Påminnelse skickades',cancelled:'Förfrågan annullerades'} as Record<string,string>)[type]||type}
