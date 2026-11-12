import struct

def pack_font(data):
    unpack=lambda fmt,offset: struct.unpack_from('>'+fmt,data,offset)
    tables={tag:off for tag,_,off,_ in (unpack('4sIII',i) for i in range(12,12+16*unpack('H',4)[0],16))}
    os=tables[b'OS/2']
    weight,=unpack('H',os+4)
    fs_type,=unpack('H',os+8)
    if fs_type & 0x0006: raise ValueError('Font disallows editable embedding')
    names=tables[b'name']
    _,count,strings=unpack('HHH',names)
    records={}
    for i in range(count):
        platform,encoding,language,key,length,offset=unpack('HHHHHH',names+6+i*12)
        if platform==3 and language==0x409:
            start=names+strings+offset
            records[key]=data[start:start+length].decode('utf-16-be').encode('utf-16-le')
    labels=b''.join(struct.pack('<HH',0,len(records[k]))+records[k] for k in (1,2,5,4))
    flags=struct.pack('<10sBBIHH11I',data[os+32:os+42],1,unpack('H',os+62)[0]&1,weight,fs_type,0x504c,*unpack('4I',os+42),*unpack('2I',os+78),unpack('I',tables[b'head']+8)[0],0,0,0,0)
    header=flags+labels+b'\0'*4
    return struct.pack('<4I',16+len(header)+len(data),len(data),0x20001,0)+header+data
