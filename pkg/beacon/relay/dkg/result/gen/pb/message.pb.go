// Code generated by protoc-gen-gogo. DO NOT EDIT.
// source: pb/message.proto

package pb

import (
	bytes "bytes"
	fmt "fmt"
	proto "github.com/gogo/protobuf/proto"
	io "io"
	math "math"
	math_bits "math/bits"
	reflect "reflect"
	strings "strings"
)

// Reference imports to suppress errors if they are not otherwise used.
var _ = proto.Marshal
var _ = fmt.Errorf
var _ = math.Inf

// This is a compile-time assertion to ensure that this generated file
// is compatible with the proto package it is being compiled against.
// A compilation error at this line likely means your copy of the
// proto package needs to be updated.
const _ = proto.GoGoProtoPackageIsVersion3 // please upgrade the proto package

// DKGResultHashSignature contains a marshalled hash of the DKG result preferred
// by the sender, as well as a marshalled signature over this hash and sender's
// public key which can be used to verify the signature.
type DKGResultHashSignature struct {
	SenderIndex uint32 `protobuf:"varint,1,opt,name=senderIndex,proto3" json:"senderIndex,omitempty"`
	ResultHash  []byte `protobuf:"bytes,2,opt,name=resultHash,proto3" json:"resultHash,omitempty"`
	Signature   []byte `protobuf:"bytes,3,opt,name=signature,proto3" json:"signature,omitempty"`
	PublicKey   []byte `protobuf:"bytes,4,opt,name=publicKey,proto3" json:"publicKey,omitempty"`
}

func (m *DKGResultHashSignature) Reset()      { *m = DKGResultHashSignature{} }
func (*DKGResultHashSignature) ProtoMessage() {}
func (*DKGResultHashSignature) Descriptor() ([]byte, []int) {
	return fileDescriptor_8447775385e7eb85, []int{0}
}
func (m *DKGResultHashSignature) XXX_Unmarshal(b []byte) error {
	return m.Unmarshal(b)
}
func (m *DKGResultHashSignature) XXX_Marshal(b []byte, deterministic bool) ([]byte, error) {
	if deterministic {
		return xxx_messageInfo_DKGResultHashSignature.Marshal(b, m, deterministic)
	} else {
		b = b[:cap(b)]
		n, err := m.MarshalToSizedBuffer(b)
		if err != nil {
			return nil, err
		}
		return b[:n], nil
	}
}
func (m *DKGResultHashSignature) XXX_Merge(src proto.Message) {
	xxx_messageInfo_DKGResultHashSignature.Merge(m, src)
}
func (m *DKGResultHashSignature) XXX_Size() int {
	return m.Size()
}
func (m *DKGResultHashSignature) XXX_DiscardUnknown() {
	xxx_messageInfo_DKGResultHashSignature.DiscardUnknown(m)
}

var xxx_messageInfo_DKGResultHashSignature proto.InternalMessageInfo

func (m *DKGResultHashSignature) GetSenderIndex() uint32 {
	if m != nil {
		return m.SenderIndex
	}
	return 0
}

func (m *DKGResultHashSignature) GetResultHash() []byte {
	if m != nil {
		return m.ResultHash
	}
	return nil
}

func (m *DKGResultHashSignature) GetSignature() []byte {
	if m != nil {
		return m.Signature
	}
	return nil
}

func (m *DKGResultHashSignature) GetPublicKey() []byte {
	if m != nil {
		return m.PublicKey
	}
	return nil
}

func init() {
	proto.RegisterType((*DKGResultHashSignature)(nil), "result.DKGResultHashSignature")
}

func init() { proto.RegisterFile("pb/message.proto", fileDescriptor_8447775385e7eb85) }

var fileDescriptor_8447775385e7eb85 = []byte{
	// 210 bytes of a gzipped FileDescriptorProto
	0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff, 0xe2, 0x12, 0x28, 0x48, 0xd2, 0xcf,
	0x4d, 0x2d, 0x2e, 0x4e, 0x4c, 0x4f, 0xd5, 0x2b, 0x28, 0xca, 0x2f, 0xc9, 0x17, 0x62, 0x2b, 0x4a,
	0x2d, 0x2e, 0xcd, 0x29, 0x51, 0x9a, 0xc6, 0xc8, 0x25, 0xe6, 0xe2, 0xed, 0x1e, 0x04, 0xe6, 0x79,
	0x24, 0x16, 0x67, 0x04, 0x67, 0xa6, 0xe7, 0x25, 0x96, 0x94, 0x16, 0xa5, 0x0a, 0x29, 0x70, 0x71,
	0x17, 0xa7, 0xe6, 0xa5, 0xa4, 0x16, 0x79, 0xe6, 0xa5, 0xa4, 0x56, 0x48, 0x30, 0x2a, 0x30, 0x6a,
	0xf0, 0x06, 0x21, 0x0b, 0x09, 0xc9, 0x71, 0x71, 0x15, 0xc1, 0x35, 0x4a, 0x30, 0x29, 0x30, 0x6a,
	0xf0, 0x04, 0x21, 0x89, 0x08, 0xc9, 0x70, 0x71, 0x16, 0xc3, 0x8c, 0x93, 0x60, 0x06, 0x4b, 0x23,
	0x04, 0x40, 0xb2, 0x05, 0xa5, 0x49, 0x39, 0x99, 0xc9, 0xde, 0xa9, 0x95, 0x12, 0x2c, 0x10, 0x59,
	0xb8, 0x80, 0x93, 0xc5, 0x85, 0x87, 0x72, 0x0c, 0x37, 0x1e, 0xca, 0x31, 0x7c, 0x78, 0x28, 0xc7,
	0xd8, 0xf0, 0x48, 0x8e, 0x71, 0xc5, 0x23, 0x39, 0xc6, 0x13, 0x8f, 0xe4, 0x18, 0x2f, 0x3c, 0x92,
	0x63, 0x7c, 0xf0, 0x48, 0x8e, 0xf1, 0xc5, 0x23, 0x39, 0x86, 0x0f, 0x8f, 0xe4, 0x18, 0x27, 0x3c,
	0x96, 0x63, 0xb8, 0xf0, 0x58, 0x8e, 0xe1, 0xc6, 0x63, 0x39, 0x86, 0x28, 0xa6, 0x82, 0xa4, 0x24,
	0x36, 0xb0, 0x0f, 0x8d, 0x01, 0x01, 0x00, 0x00, 0xff, 0xff, 0x0c, 0x9d, 0x0e, 0x4b, 0xf5, 0x00,
	0x00, 0x00,
}

func (this *DKGResultHashSignature) Equal(that interface{}) bool {
	if that == nil {
		return this == nil
	}

	that1, ok := that.(*DKGResultHashSignature)
	if !ok {
		that2, ok := that.(DKGResultHashSignature)
		if ok {
			that1 = &that2
		} else {
			return false
		}
	}
	if that1 == nil {
		return this == nil
	} else if this == nil {
		return false
	}
	if this.SenderIndex != that1.SenderIndex {
		return false
	}
	if !bytes.Equal(this.ResultHash, that1.ResultHash) {
		return false
	}
	if !bytes.Equal(this.Signature, that1.Signature) {
		return false
	}
	if !bytes.Equal(this.PublicKey, that1.PublicKey) {
		return false
	}
	return true
}
func (this *DKGResultHashSignature) GoString() string {
	if this == nil {
		return "nil"
	}
	s := make([]string, 0, 8)
	s = append(s, "&pb.DKGResultHashSignature{")
	s = append(s, "SenderIndex: "+fmt.Sprintf("%#v", this.SenderIndex)+",\n")
	s = append(s, "ResultHash: "+fmt.Sprintf("%#v", this.ResultHash)+",\n")
	s = append(s, "Signature: "+fmt.Sprintf("%#v", this.Signature)+",\n")
	s = append(s, "PublicKey: "+fmt.Sprintf("%#v", this.PublicKey)+",\n")
	s = append(s, "}")
	return strings.Join(s, "")
}
func valueToGoStringMessage(v interface{}, typ string) string {
	rv := reflect.ValueOf(v)
	if rv.IsNil() {
		return "nil"
	}
	pv := reflect.Indirect(rv).Interface()
	return fmt.Sprintf("func(v %v) *%v { return &v } ( %#v )", typ, typ, pv)
}
func (m *DKGResultHashSignature) Marshal() (dAtA []byte, err error) {
	size := m.Size()
	dAtA = make([]byte, size)
	n, err := m.MarshalToSizedBuffer(dAtA[:size])
	if err != nil {
		return nil, err
	}
	return dAtA[:n], nil
}

func (m *DKGResultHashSignature) MarshalTo(dAtA []byte) (int, error) {
	size := m.Size()
	return m.MarshalToSizedBuffer(dAtA[:size])
}

func (m *DKGResultHashSignature) MarshalToSizedBuffer(dAtA []byte) (int, error) {
	i := len(dAtA)
	_ = i
	var l int
	_ = l
	if len(m.PublicKey) > 0 {
		i -= len(m.PublicKey)
		copy(dAtA[i:], m.PublicKey)
		i = encodeVarintMessage(dAtA, i, uint64(len(m.PublicKey)))
		i--
		dAtA[i] = 0x22
	}
	if len(m.Signature) > 0 {
		i -= len(m.Signature)
		copy(dAtA[i:], m.Signature)
		i = encodeVarintMessage(dAtA, i, uint64(len(m.Signature)))
		i--
		dAtA[i] = 0x1a
	}
	if len(m.ResultHash) > 0 {
		i -= len(m.ResultHash)
		copy(dAtA[i:], m.ResultHash)
		i = encodeVarintMessage(dAtA, i, uint64(len(m.ResultHash)))
		i--
		dAtA[i] = 0x12
	}
	if m.SenderIndex != 0 {
		i = encodeVarintMessage(dAtA, i, uint64(m.SenderIndex))
		i--
		dAtA[i] = 0x8
	}
	return len(dAtA) - i, nil
}

func encodeVarintMessage(dAtA []byte, offset int, v uint64) int {
	offset -= sovMessage(v)
	base := offset
	for v >= 1<<7 {
		dAtA[offset] = uint8(v&0x7f | 0x80)
		v >>= 7
		offset++
	}
	dAtA[offset] = uint8(v)
	return base
}
func (m *DKGResultHashSignature) Size() (n int) {
	if m == nil {
		return 0
	}
	var l int
	_ = l
	if m.SenderIndex != 0 {
		n += 1 + sovMessage(uint64(m.SenderIndex))
	}
	l = len(m.ResultHash)
	if l > 0 {
		n += 1 + l + sovMessage(uint64(l))
	}
	l = len(m.Signature)
	if l > 0 {
		n += 1 + l + sovMessage(uint64(l))
	}
	l = len(m.PublicKey)
	if l > 0 {
		n += 1 + l + sovMessage(uint64(l))
	}
	return n
}

func sovMessage(x uint64) (n int) {
	return (math_bits.Len64(x|1) + 6) / 7
}
func sozMessage(x uint64) (n int) {
	return sovMessage(uint64((x << 1) ^ uint64((int64(x) >> 63))))
}
func (this *DKGResultHashSignature) String() string {
	if this == nil {
		return "nil"
	}
	s := strings.Join([]string{`&DKGResultHashSignature{`,
		`SenderIndex:` + fmt.Sprintf("%v", this.SenderIndex) + `,`,
		`ResultHash:` + fmt.Sprintf("%v", this.ResultHash) + `,`,
		`Signature:` + fmt.Sprintf("%v", this.Signature) + `,`,
		`PublicKey:` + fmt.Sprintf("%v", this.PublicKey) + `,`,
		`}`,
	}, "")
	return s
}
func valueToStringMessage(v interface{}) string {
	rv := reflect.ValueOf(v)
	if rv.IsNil() {
		return "nil"
	}
	pv := reflect.Indirect(rv).Interface()
	return fmt.Sprintf("*%v", pv)
}
func (m *DKGResultHashSignature) Unmarshal(dAtA []byte) error {
	l := len(dAtA)
	iNdEx := 0
	for iNdEx < l {
		preIndex := iNdEx
		var wire uint64
		for shift := uint(0); ; shift += 7 {
			if shift >= 64 {
				return ErrIntOverflowMessage
			}
			if iNdEx >= l {
				return io.ErrUnexpectedEOF
			}
			b := dAtA[iNdEx]
			iNdEx++
			wire |= uint64(b&0x7F) << shift
			if b < 0x80 {
				break
			}
		}
		fieldNum := int32(wire >> 3)
		wireType := int(wire & 0x7)
		if wireType == 4 {
			return fmt.Errorf("proto: DKGResultHashSignature: wiretype end group for non-group")
		}
		if fieldNum <= 0 {
			return fmt.Errorf("proto: DKGResultHashSignature: illegal tag %d (wire type %d)", fieldNum, wire)
		}
		switch fieldNum {
		case 1:
			if wireType != 0 {
				return fmt.Errorf("proto: wrong wireType = %d for field SenderIndex", wireType)
			}
			m.SenderIndex = 0
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return ErrIntOverflowMessage
				}
				if iNdEx >= l {
					return io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				m.SenderIndex |= uint32(b&0x7F) << shift
				if b < 0x80 {
					break
				}
			}
		case 2:
			if wireType != 2 {
				return fmt.Errorf("proto: wrong wireType = %d for field ResultHash", wireType)
			}
			var byteLen int
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return ErrIntOverflowMessage
				}
				if iNdEx >= l {
					return io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				byteLen |= int(b&0x7F) << shift
				if b < 0x80 {
					break
				}
			}
			if byteLen < 0 {
				return ErrInvalidLengthMessage
			}
			postIndex := iNdEx + byteLen
			if postIndex < 0 {
				return ErrInvalidLengthMessage
			}
			if postIndex > l {
				return io.ErrUnexpectedEOF
			}
			m.ResultHash = append(m.ResultHash[:0], dAtA[iNdEx:postIndex]...)
			if m.ResultHash == nil {
				m.ResultHash = []byte{}
			}
			iNdEx = postIndex
		case 3:
			if wireType != 2 {
				return fmt.Errorf("proto: wrong wireType = %d for field Signature", wireType)
			}
			var byteLen int
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return ErrIntOverflowMessage
				}
				if iNdEx >= l {
					return io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				byteLen |= int(b&0x7F) << shift
				if b < 0x80 {
					break
				}
			}
			if byteLen < 0 {
				return ErrInvalidLengthMessage
			}
			postIndex := iNdEx + byteLen
			if postIndex < 0 {
				return ErrInvalidLengthMessage
			}
			if postIndex > l {
				return io.ErrUnexpectedEOF
			}
			m.Signature = append(m.Signature[:0], dAtA[iNdEx:postIndex]...)
			if m.Signature == nil {
				m.Signature = []byte{}
			}
			iNdEx = postIndex
		case 4:
			if wireType != 2 {
				return fmt.Errorf("proto: wrong wireType = %d for field PublicKey", wireType)
			}
			var byteLen int
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return ErrIntOverflowMessage
				}
				if iNdEx >= l {
					return io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				byteLen |= int(b&0x7F) << shift
				if b < 0x80 {
					break
				}
			}
			if byteLen < 0 {
				return ErrInvalidLengthMessage
			}
			postIndex := iNdEx + byteLen
			if postIndex < 0 {
				return ErrInvalidLengthMessage
			}
			if postIndex > l {
				return io.ErrUnexpectedEOF
			}
			m.PublicKey = append(m.PublicKey[:0], dAtA[iNdEx:postIndex]...)
			if m.PublicKey == nil {
				m.PublicKey = []byte{}
			}
			iNdEx = postIndex
		default:
			iNdEx = preIndex
			skippy, err := skipMessage(dAtA[iNdEx:])
			if err != nil {
				return err
			}
			if (skippy < 0) || (iNdEx+skippy) < 0 {
				return ErrInvalidLengthMessage
			}
			if (iNdEx + skippy) > l {
				return io.ErrUnexpectedEOF
			}
			iNdEx += skippy
		}
	}

	if iNdEx > l {
		return io.ErrUnexpectedEOF
	}
	return nil
}
func skipMessage(dAtA []byte) (n int, err error) {
	l := len(dAtA)
	iNdEx := 0
	depth := 0
	for iNdEx < l {
		var wire uint64
		for shift := uint(0); ; shift += 7 {
			if shift >= 64 {
				return 0, ErrIntOverflowMessage
			}
			if iNdEx >= l {
				return 0, io.ErrUnexpectedEOF
			}
			b := dAtA[iNdEx]
			iNdEx++
			wire |= (uint64(b) & 0x7F) << shift
			if b < 0x80 {
				break
			}
		}
		wireType := int(wire & 0x7)
		switch wireType {
		case 0:
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return 0, ErrIntOverflowMessage
				}
				if iNdEx >= l {
					return 0, io.ErrUnexpectedEOF
				}
				iNdEx++
				if dAtA[iNdEx-1] < 0x80 {
					break
				}
			}
		case 1:
			iNdEx += 8
		case 2:
			var length int
			for shift := uint(0); ; shift += 7 {
				if shift >= 64 {
					return 0, ErrIntOverflowMessage
				}
				if iNdEx >= l {
					return 0, io.ErrUnexpectedEOF
				}
				b := dAtA[iNdEx]
				iNdEx++
				length |= (int(b) & 0x7F) << shift
				if b < 0x80 {
					break
				}
			}
			if length < 0 {
				return 0, ErrInvalidLengthMessage
			}
			iNdEx += length
		case 3:
			depth++
		case 4:
			if depth == 0 {
				return 0, ErrUnexpectedEndOfGroupMessage
			}
			depth--
		case 5:
			iNdEx += 4
		default:
			return 0, fmt.Errorf("proto: illegal wireType %d", wireType)
		}
		if iNdEx < 0 {
			return 0, ErrInvalidLengthMessage
		}
		if depth == 0 {
			return iNdEx, nil
		}
	}
	return 0, io.ErrUnexpectedEOF
}

var (
	ErrInvalidLengthMessage        = fmt.Errorf("proto: negative length found during unmarshaling")
	ErrIntOverflowMessage          = fmt.Errorf("proto: integer overflow")
	ErrUnexpectedEndOfGroupMessage = fmt.Errorf("proto: unexpected end of group")
)
