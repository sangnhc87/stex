/*
 * ======================================================
 *          MODULE TỰ CHỨA CHO DIALOG GÁN ID
 * ======================================================
 * File này chứa toàn bộ logic cho dialog "Gán ID".
 * Nó tự tìm nút mở, tự xử lý việc mở/đóng và cập nhật dữ liệu.
 * BẠN KHÔNG CẦN SỬA FILE app.protected.js.
 */
document.addEventListener('DOMContentLoaded', () => {

    // (QUAN TRỌNG: Hãy copy toàn bộ đối tượng 'data' khổng lồ của bạn vào đây)
    const data ={
            0: {
                D: {
                    chapters: [
                        { name: 'Chương 1. Mệnh đề. Tập hợp', value: '1' },
                        { name: 'Chương 2. BPT và hệ BPT bậc nhất hai ẩn', value: '2' },
                        { name: 'Chương 3. Hàm số bậc hai và đồ thị', value: '3' },
                        { name: 'Chương 7. Bất phương trình bậc 2 một ẩn', value: '7' }
                    ],
                    lessons: [
                        [
                            {
                                name: 'Bài 1: Mệnh đề', value: '1', types: [
                                    { name: 'Xác định mệnh đề, mệnh đề chứa biến', value: '1' },
                                    { name: 'Tính đúng-sai của mệnh đề', value: '2' },
                                    { name: 'Phủ định của một mệnh đề', value: '3' },
                                    { name: 'Mệnh đề kéo theo, mệnh đề đảo, mệnh đề tương đương', value: '4' },
                                    { name: 'Mệnh đề với mọi, tồn tại (và phủ định chúng)', value: '5' },
                                    { name: 'Áp dụng mệnh đề vào suy luận có lí', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 2: Tập hợp', value: '2', types: [
                                    { name: 'Tập hợp và phần tử của tập hợp', value: '1' },
                                    { name: 'Tập hợp con. Hai tập hợp bằng nhau', value: '2' },
                                    { name: 'Ký hiệu khoảng, đoạn, nửa khoảng', value: '3' }
                                ]
                            },
                            {
                                name: 'Bài 3: Các phép toán tập hợp', value: '3', types: [
                                    { name: 'Giao và hợp của hai tập hợp (rời rạc)', value: '1' },
                                    { name: 'Hiệu và phần bù của hai tập hợp (rời rạc)', value: '2' },
                                    { name: 'Giao và hợp (dùng đoạn, khoảng)', value: '3' },
                                    { name: 'Hiệu và phần bù (dùng đoạn, khoảng)', value: '4' },
                                    { name: 'Toán thực tế ứng dụng của tập hợp', value: '5' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Bất phương trình bậc nhất hai ẩn', value: '1', types: [
                                    { name: 'Các khái niệm về BPT bậc nhất hai ẩn', value: '1' },
                                    { name: 'Miền nghiệm của BPT bậc nhất hai ẩn', value: '2' },
                                    { name: 'Toán thực tế về BPT bậc nhất hai ẩn', value: '3' }
                                ]
                            },
                            {
                                name: 'Bài 2: Hệ bất phương trình bậc nhất hai ẩn', value: '2', types: [
                                    { name: 'Các khái niệm về Hệ BPT bậc nhất hai ẩn', value: '1' },
                                    { name: 'Miền nghiệm của Hệ BPT bậc nhất hai ẩn', value: '2' },
                                    { name: 'Toán thực tế về Hệ BPT bậc nhất hai ẩn', value: '3' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Hàm số', value: '1', types: [
                                    { name: 'Xác định một hàm số', value: '1' },
                                    { name: 'Tập xác định của hàm số', value: '2' },
                                    { name: 'Giá trị của hàm số', value: '3' },
                                    { name: 'Đồ thị của hàm số', value: '4' },
                                    { name: 'Tính đồng biến, nghịch biến', value: '5' },
                                    { name: 'Tính chẵn, lẻ', value: '6' },
                                    { name: 'Toán thực tế về hàm số', value: '7' }
                                ]
                            },
                            {
                                name: 'Bài 2: Hàm số bậc hai', value: '2', types: [
                                    { name: 'Xác định hàm số bậc hai', value: '1' },
                                    { name: 'Bảng biến thiên, tính đơn điệu, max, min', value: '2' },
                                    { name: 'Đồ thị của hàm số bậc hai', value: '3' },
                                    { name: 'Bài toán về sự tương giao', value: '4' },
                                    { name: 'Hàm số chứa dấu giá trị tuyệt đối', value: '5' },
                                    { name: 'Toán thực tế ứng dụng hàm số bậc hai', value: '6' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Dấu của tam thức bậc 2', value: '1', types: [
                                    { name: 'Xác định tam thức bậc 2', value: '1' },
                                    { name: 'Dấu của tam thức bậc 2 và ứng dụng', value: '2' },
                                    { name: 'Bài toán xét dấu biết BXD, đồ thị', value: '3' },
                                    { name: 'Xét dấu biểu thức dạng tích, thương', value: '4' },
                                    { name: 'Toán thực tế ứng dụng dấu tam thức bậc 2', value: '5' }
                                ]
                            },
                            {
                                name: 'Bài 2: Giải bất phương trình bậc 2 một ẩn', value: '2', types: [
                                    { name: 'Bất phương trình bậc 2 và ứng dụng', value: '1' },
                                    { name: 'Giải bất phương trình bậc hai biết BXD, đồ thị', value: '2' },
                                    { name: 'Bất phương trình dạng tích, thương', value: '3' },
                                    { name: 'Hệ bất phương trình BPT bậc 2', value: '4' },
                                    { name: 'Bất phương trình chứa căn, | · |', value: '5' },
                                    { name: 'Bài toán có tham số m', value: '6' },
                                    { name: 'Toán thực tế ứng dụng bất phương trình bậc 2 một ẩn', value: '7' }
                                ]
                            },
                            {
                                name: 'Bài 3: Phương trình quy về phương trình bậc hai', value: '3', types: [
                                    { name: 'Phương trình căn √f(x) = √g(x) và mở rộng', value: '1' },
                                    { name: 'Phương trình căn √f(x) = g(x) và mở rộng', value: '2' },
                                    { name: 'Phương trình căn thức có tham số', value: '3' },
                                    { name: 'Phương trình căn thức (dạng khác)', value: '4' },
                                    { name: 'Phương trình khác quy về phương trình bậc 2', value: '5' },
                                    { name: 'Toán hình, toán thực tế ứng dụng phương trình quy về bậc 2', value: '6' }
                                ]
                            }
                        ]
                    ]
                },
                H: {
                    chapters: [
                        { name: 'Chương 4. Hệ thức lượng trong tam giác', value: '4' },
                        { name: 'Chương 5. Véctơ (chưa xét tọa độ)', value: '5' },
                        { name: 'Chương 9. Phương pháp toạ độ trong mặt phẳng (Oxy)', value: '9' }
                    ],
                    lessons: [
                        [
                            {
                                name: 'Bài 1: Giá trị lượng giác của góc (0 -> 180∘)', value: '1', types: [
                                    { name: 'Xét dấu của biểu thức lượng giác', value: '1' },
                                    { name: 'Tính các giá trị lượng giác', value: '2' },
                                    { name: 'Biến đổi, rút gọn biểu thức lượng giác', value: '3' }
                                ]
                            },
                            {
                                name: 'Bài 2: Định lý sin và định lý côsin', value: '2', types: [
                                    { name: 'Bài toán chỉ dùng định lý Sin, Côsin', value: '1' },
                                    { name: 'Bài toán có dùng công thức diện tích', value: '2' },
                                    { name: 'Biến đổi, rút gọn biểu thức', value: '3' },
                                    { name: 'Nhận dạng tam giác', value: '4' }
                                ]
                            },
                            {
                                name: 'Bài 3: Giải tam giác và ứng dụng thực tế', value: '3', types: [
                                    { name: 'Giải tam giác', value: '1' },
                                    { name: 'Các ứng dụng thực tế', value: '2' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Khái niệm véctơ', value: '1', types: [
                                    { name: 'Xác định một véctơ', value: '1' },
                                    { name: 'Xét phương và hướng của các véctơ', value: '2' },
                                    { name: 'Hai véctơ bằng nhau', value: '3' },
                                    { name: 'Hai véctơ đối nhau', value: '4' },
                                    { name: 'Độ dài của một véctơ', value: '5' },
                                    { name: 'Toán thực tế áp dụng véctơ', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 2: Tổng và hiệu của hai véctơ', value: '2', types: [
                                    { name: 'Tính toán, thu gọn hiệu các véctơ', value: '1' },
                                    { name: 'Tính đúng-sai của 1 đẳng thức véctơ', value: '2' },
                                    { name: 'Tìm điểm nhờ đẳng thức véctơ', value: '3' },
                                    { name: 'Tính độ dài của véctơ tổng, hiệu', value: '4' },
                                    { name: 'Cực trị hình học', value: '5' },
                                    { name: 'Toán thực tế áp dụng tổng hiệu véctơ', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 3: Tích của một số với véctơ', value: '3', types: [
                                    { name: 'Xác định k.→−a và độ dài của nó', value: '1' },
                                    { name: 'Biến đổi, thu gọn 1 đẳng thức véctơ', value: '2' },
                                    { name: 'Tìm điểm nhờ đẳng thức véctơ', value: '3' },
                                    { name: 'Sự cùng phương của 2 véctơ và ứng dụng', value: '4' },
                                    { name: 'Phân tích 1 véctơ theo 2 véctơ không cùng phương', value: '5' },
                                    { name: 'Tính độ dài của véctơ tổng, hiệu', value: '6' },
                                    { name: 'Tập hợp điểm', value: '7' },
                                    { name: 'Cực trị hình học', value: '8' },
                                    { name: 'Toán thực tế áp dụng tích 1 số với véctơ', value: '9' }
                                ]
                            },
                            {
                                name: 'Bài 4: Tích vô hướng (chưa xét tọa độ)', value: '4', types: [
                                    { name: 'Tích vô hướng, góc giữa 2 véctơ', value: '1' },
                                    { name: 'Tìm góc nhờ tích vô hướng', value: '2' },
                                    { name: 'Đẳng thức về tích vô hướng hoặc độ dài', value: '3' },
                                    { name: 'Điều kiện vuông góc', value: '4' },
                                    { name: 'Các bài toán tìm điểm và tập hợp điểm', value: '5' },
                                    { name: 'Cực trị và chứng minh bất đẳng thức', value: '6' },
                                    { name: 'Toán thực tế áp dụng tích vô hướng', value: '7' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Toạ độ của véctơ', value: '1', types: [
                                    { name: 'Tọa độ điểm, độ dài đại số của véctơ trên 1 trục', value: '1' },
                                    { name: 'Phép toán véctơ (tổng, hiệu, tích với số) trong Oxy', value: '2' },
                                    { name: 'Tọa độ điểm và véctơ trên hệ trục Oxy', value: '3' },
                                    { name: 'Sự cùng phương của 2 véctơ và ứng dụng', value: '4' },
                                    { name: 'Phân tích một véctơ theo 2 véctơ không cùng phương', value: '5' },
                                    { name: 'Toán thực tế dùng hệ toạ độ', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 2: Tích vô hướng (theo tọa độ)', value: '2', types: [
                                    { name: 'Tích vô hướng, góc giữa 2 véctơ', value: '1' },
                                    { name: 'Tìm góc nhờ tích vô hướng', value: '2' },
                                    { name: 'Đẳng thức về tích vô hướng hoặc độ dài', value: '3' },
                                    { name: 'Điều kiện vuông góc', value: '4' },
                                    { name: 'Các bài toán tìm điểm và tập hợp điểm', value: '5' },
                                    { name: 'Cực trị và chứng minh bất đẳng thức', value: '6' },
                                    { name: 'Toán thực tế, liên môn', value: '7' }
                                ]
                            },
                            {
                                name: 'Bài 3: Đường thẳng trong mặt phẳng toạ độ', value: '3', types: [
                                    { name: 'Điểm, véctơ, hệ số góc của đường thẳng', value: '1' },
                                    { name: 'Phương trình đường thẳng', value: '2' },
                                    { name: 'Vị trí tương đối giữa hai đường thẳng', value: '3' },
                                    { name: 'Bài toán về góc giữa hai đường thẳng', value: '4' },
                                    { name: 'Bài toán về khoảng cách', value: '5' },
                                    { name: 'Bài toán tìm điểm', value: '6' },
                                    { name: 'Bài toán dùng cho tam giác, tứ giác', value: '7' },
                                    { name: 'Bài toán thực tế, PP tọa độ hóa', value: '8' },
                                    { name: 'Bài toán có dùng PT chính tắc', value: '9' }
                                ]
                            },
                            {
                                name: 'Bài 4: Đường tròn trong mặt phẳng toạ độ', value: '4', types: [
                                    { name: 'Tìm tâm, bán kính và điều kiện là đường tròn', value: '1' },
                                    { name: 'Phương trình đường tròn', value: '2' },
                                    { name: 'Phương trình tiếp tuyến của đường tròn', value: '3' },
                                    { name: 'Vị trí tương đối liên quan đường tròn', value: '4' },
                                    { name: 'Toán tổng hợp đường thẳng và đường tròn', value: '5' },
                                    { name: 'Bài toán dùng cho tam giác, tứ giác', value: '6' },
                                    { name: 'Bài toán thực tế, PP tọa độ hóa', value: '7' }
                                ]
                            },
                            {
                                name: 'Bài 5: Ba đường conic trong mặt phẳng toạ độ', value: '5', types: [
                                    { name: 'Xác định các yếu tố của elip', value: '1' },
                                    { name: 'Phương trình chính tắc của elip', value: '2' },
                                    { name: 'Bài toán điểm trên elip', value: '3' },
                                    { name: 'Xác định các yếu tố của hypebol', value: '4' },
                                    { name: 'Phương trình chính tắc của hypebol', value: '5' },
                                    { name: 'Bài toán điểm trên hypebol', value: '6' },
                                    { name: 'Xác định các yếu tố của parabol', value: '7' },
                                    { name: 'Phương trình chính tắc của parabol', value: '8' },
                                    { name: 'Bài toán điểm trên parabol', value: '9' },
                                    { name: 'Bài toán tổng hợp/thực tế, PP tọa độ hóa 3 đường conic', value: '0' }
                                ]
                            }
                        ]
                    ]
                },
                X: {
                    chapters: [
                        { name: 'Chương 6. Thống kê', value: '6' },
                        { name: 'Chương 8. Đại số tổ hợp', value: '8' },
                        { name: 'Chương 10. Xác suất', value: '0' }
                    ],
                    lessons: [
                        [
                            {
                                name: 'Bài 1: Số gần đúng. Sai số', value: '1', types: [
                                    { name: 'Tính và ước lượng sai số tuyệt đối, tương đối', value: '1' },
                                    { name: 'Tính và xác định độ chính xác của kết quả', value: '2' },
                                    { name: 'Quy tròn số gần đúng', value: '3' },
                                    { name: 'Viết số gần đúng cho số đúng biết độ chính xác', value: '4' }
                                ]
                            },
                            {
                                name: 'Bài 2: Mô tả và biểu diễn dữ liệu trên các bảng và biểu đồ', value: '2', types: [
                                    { name: 'Đọc và phân tích thông tin trên bảng số liệu', value: '1' },
                                    { name: 'Đọc và phân tích thông tin trên biểu đồ', value: '2' },
                                    { name: 'Số liệu bất thường trên bảng số liệu', value: '3' },
                                    { name: 'Số liệu bất thường trên biểu đồ', value: '4' }
                                ]
                            },
                            {
                                name: 'Bài 3: Các số đặc trưng đo xu thế trung tâm của mẫu số liệu', value: '3', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Số trung bình cộng', value: '2' },
                                    { name: 'Số trung vị', value: '3' },
                                    { name: 'Tứ phân vị', value: '4' },
                                    { name: 'Mốt', value: '5' }
                                ]
                            },
                            {
                                name: 'Bài 4: Các số đặc trưng đo mức độ phân tán của mẫu số liệu', value: '4', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Khoảng biến thiên, khoảng tứ phân vị', value: '2' },
                                    { name: 'Giá trị bất thường của mẫu số liệu', value: '3' },
                                    { name: 'Phương sai, độ lệch chuẩn của mẫu số liệu', value: '4' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Quy tắc cộng-quy tắc nhân', value: '1', types: [
                                    { name: 'Bài toán chỉ sử dụng quy tắc cộng', value: '1' },
                                    { name: 'Bài toán chỉ sử dụng quy tắc nhân', value: '2' },
                                    { name: 'Bài toán kết hợp quy tắc cộng và quy tắc nhân', value: '3' },
                                    { name: 'Bài toán dùng quy tắc bù trừ', value: '4' },
                                    { name: 'Bài toán đếm số tự nhiên', value: '5' },
                                    { name: 'Sơ đồ hình cây', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 2: Hoán vị. Chỉnh hợp. Tổ hợp', value: '2', types: [
                                    { name: 'Lý thuyết tổng hợp về P,C,A', value: '1' },
                                    { name: 'Bài toán có biểu thức P,C,A', value: '2' },
                                    { name: 'Bài toán đếm số tự nhiên', value: '3' },
                                    { name: 'Bài toán chọn người', value: '4' },
                                    { name: 'Bài toán chọn đối tượng khác', value: '5' },
                                    { name: 'Bài toán có yếu tố hình học', value: '6' },
                                    { name: 'Bài toán xếp chỗ (không tròn, không lặp)', value: '7' },
                                    { name: 'Hoán vị bàn tròn', value: '8' },
                                    { name: 'Hoán vị lặp', value: '9' }
                                ]
                            },
                            {
                                name: 'Bài 3: Nhị thức Newton', value: '3', types: [
                                    { name: 'Các câu hỏi lý thuyết tổng hợp', value: '1' },
                                    { name: 'Khai triển một nhị thức Newton', value: '2' },
                                    { name: 'Tìm hệ số, số hạng trong khai triển bằng tam giác Pascal', value: '3' },
                                    { name: 'Tìm hệ số, số hạng trong khai triển', value: '4' },
                                    { name: 'Tính tổng nhờ khai triển nhị thức Newton', value: '5' },
                                    { name: 'Toán tổ hợp có dùng nhị thức Newton', value: '6' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Không gian mẫu và biến cố', value: '1', types: [
                                    { name: 'Các câu hỏi lý thuyết tổng hợp', value: '1' },
                                    { name: 'Mô tả không gian mẫu, biến cố', value: '2' },
                                    { name: 'Đếm phần tử không gian mẫu, biến cố', value: '3' }
                                ]
                            },
                            {
                                name: 'Bài 2: Xác suất của biến cố', value: '2', types: [
                                    { name: 'Các câu hỏi lý thuyết tổng hợp', value: '1' },
                                    { name: 'Liên quan xúc xắc, đồng tiền (PP liệt kê)', value: '2' },
                                    { name: 'Liên quan việc sắp xếp chỗ', value: '3' },
                                    { name: 'Liên quan việc chọn người', value: '4' },
                                    { name: 'Liên quan việc chọn đối tượng khác', value: '5' },
                                    { name: 'Liên quan hình học', value: '6' },
                                    { name: 'Liên quan việc đếm số', value: '7' },
                                    { name: 'Liên quan bàn tròn hoặc hoán vị lặp', value: '8' },
                                    { name: 'Liên quan vấn đề khác', value: '9' }
                                ]
                            }
                        ]
                    ]
                }
            },
            1: {
                D: {
                    chapters: [
                        { name: 'Chương 1. Hàm số lượng giác và phương trình lượng giác', value: '1' },
                        { name: 'Chương 2. Dãy số. Cấp số cộng. Cấp số nhân', value: '2' },
                        { name: 'Chương 3. Giới hạn. Hàm số liên tục', value: '3' },
                        { name: 'Chương 6. Hàm số mũ và hàm số lôgarít', value: '6' },
                        { name: 'Chương 7. Đạo hàm', value: '7' }
                    ],
                    lessons: [
                        [
                            {
                                name: 'Bài 1: Góc lượng giác', value: '1', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Chuyển đổi đơn vị độ và radian', value: '2' },
                                    { name: 'Số đo của một góc lượng giác', value: '3' },
                                    { name: 'Độ dài của một cung tròn', value: '4' },
                                    { name: 'Đường tròn lượng giác và ứng dụng', value: '5' },
                                    { name: 'Toán thực tế áp dụng góc lượng giác', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 2: Giá trị lượng giác của một góc lượng giác', value: '2', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Xét dấu giá trị lượng giác. Tính giá trị lượng giác của một góc', value: '2' },
                                    { name: 'Biến đổi, rút gọn biểu thức lượng giác; chứng minh đẳng thức lượng giác', value: '3' },
                                    { name: 'Các góc lượng giác có liên quan đặc biệt: bù nhau, phụ nhau, đối nhau, hơn kém nhau π', value: '4' },
                                    { name: 'Toán thực tế áp dụng giá trị của một góc lượng giác', value: '5' }
                                ]
                            },
                            {
                                name: 'Bài 3: Các công thức lượng giác', value: '3', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Áp dụng công thức cộng', value: '2' },
                                    { name: 'Áp dụng công thức nhân đôi - hạ bậc', value: '3' },
                                    { name: 'Áp dụng công thức biến đổi tích <-> tổng', value: '4' },
                                    { name: 'Kết hợp nhiều công thức lượng giác', value: '5' },
                                    { name: 'Nhận dạng tam giác', value: '6' },
                                    { name: 'Toán thực tế áp dụng công thức lượng giác', value: '7' }
                                ]
                            },
                            {
                                name: 'Bài 4: Hàm số lượng giác và đồ thị', value: '4', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Tìm tập xác định', value: '2' },
                                    { name: 'Xét tính đơn điệu', value: '3' },
                                    { name: 'Xét tính chẵn, lẻ', value: '4' },
                                    { name: 'Xét tính tuần hoàn, tìm chu kỳ', value: '5' },
                                    { name: 'Tìm tập giá trị và min, max', value: '6' },
                                    { name: 'Bảng biến thiên và đồ thị', value: '7' },
                                    { name: 'Toán thực tế áp dụng hàm số lượng giác', value: '8' }
                                ]
                            },
                            {
                                name: 'Bài 5: Phương trình lượng giác cơ bản', value: '5', types: [
                                    { name: 'Câu hỏi lý thuyết. Khái niệm phương trình tương đương', value: '1' },
                                    { name: 'Điều kiện có nghiệm', value: '2' },
                                    { name: 'Phương trình cơ bản dùng Radian', value: '3' },
                                    { name: 'Phương trình cơ bản dùng Độ', value: '4' },
                                    { name: 'Phương trình đưa về dạng cơ bản', value: '5' },
                                    { name: 'Toán thực tế áp dụng phương trình lượng giác', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 6: Phương trình lượng giác thường gặp', value: '6', types: [
                                    { name: 'Phương trình bậc n theo một hàm số lượng giác', value: '1' },
                                    { name: 'Phương trình đẳng cấp bậc n đối với sinx và cosx', value: '2' },
                                    { name: 'Phương trình bậc nhất đối với sinx và cosx', value: '3' },
                                    { name: 'Phương trình đối xứng, phản đối xứng', value: '4' },
                                    { name: 'Phương trình lượng giác không mẫu mực', value: '5' },
                                    { name: 'Phương trình lượng giác có chứa ẩn ở mẫu số', value: '6' },
                                    { name: 'Phương trình lượng giác có chứa tham số', value: '7' },
                                    { name: 'Toán thực tế áp dụng phương trình lượng giác thường gặp', value: '8' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Dãy số', value: '1', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Số hạng tổng quát, biểu diễn dãy số', value: '2' },
                                    { name: 'Tìm số hạng cụ thể của dãy số', value: '3' },
                                    { name: 'Dãy số tăng, dãy số giảm', value: '4' },
                                    { name: 'Dãy số bị chặn', value: '5' },
                                    { name: 'Toán thực tế áp dụng dãy số', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 2: Cấp số cộng', value: '2', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Nhận diện cấp số cộng, công sai d', value: '2' },
                                    { name: 'Số hạng tổng quát của cấp số cộng', value: '3' },
                                    { name: 'Tìm số hạng cụ thể trong cấp số cộng', value: '4' },
                                    { name: 'Điều kiện để dãy số là cấp số cộng', value: '5' },
                                    { name: 'Tính tổng của cấp số cộng', value: '6' },
                                    { name: 'Toán thực tế áp dụng cấp số cộng', value: '7' }
                                ]
                            },
                            {
                                name: 'Bài 3: Cấp số nhân', value: '3', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Nhận diện cấp số nhân, công bội q', value: '2' },
                                    { name: 'Số hạng tổng quát của cấp số nhân', value: '3' },
                                    { name: 'Tìm số hạng cụ thể trong cấp số nhân', value: '4' },
                                    { name: 'Điều kiện để dãy số là cấp số nhân', value: '5' },
                                    { name: 'Tính tổng của cấp số nhân', value: '6' },
                                    { name: 'Kết hợp cấp số nhân và cấp số cộng', value: '7' },
                                    { name: 'Toán thực tế áp dụng cấp số nhân', value: '8' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Giới hạn của dãy số', value: '1', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Phương pháp đặt thừa số chung (lim hữu hạn)', value: '2' },
                                    { name: 'Phương pháp lượng liên hợp (lim hữu hạn)', value: '3' },
                                    { name: 'Giới hạn vô cực', value: '4' },
                                    { name: 'Cấp số nhân lùi vô hạn', value: '5' },
                                    { name: 'Toán thực tế áp dụng giới hạn của dãy số', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 2: Giới hạn của hàm số', value: '2', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Thay số trực tiếp', value: '2' },
                                    { name: 'PP đặt thừa số chung, kết quả hữu hạn', value: '3' },
                                    { name: 'PP đặt thừa số chung, kết quả vô cực', value: '4' },
                                    { name: 'PP lượng liên hợp, kết quả hữu hạn', value: '5' },
                                    { name: 'PP lượng liên hợp, kết quả vô cực', value: '6' },
                                    { name: 'Giới hạn một bên', value: '7' },
                                    { name: 'Toán thực tế áp dụng giới hạn của hàm số', value: '8' }
                                ]
                            },
                            {
                                name: 'Bài 3: Hàm số liên tục', value: '3', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Tính liên tục thể hiện qua đồ thị', value: '2' },
                                    { name: 'Hàm số liên tục tại một điểm', value: '3' },
                                    { name: 'Hàm số liên tục trên khoảng, đoạn', value: '4' },
                                    { name: 'Bài toán phương trình có nghiệm', value: '5' },
                                    { name: 'Toán thực tế áp dụng hàm số liên tục', value: '6' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Phép tính luỹ thừa', value: '1', types: [
                                    { name: 'Tính giá trị của biểu thức chứa lũy thừa', value: '1' },
                                    { name: 'Biến đổi, rút gọn biểu thức chứa lũy thừa', value: '2' },
                                    { name: 'Điều kiện cho luỹ thừa, căn thức', value: '3' },
                                    { name: 'So sánh các lũy thừa', value: '4' }
                                ]
                            },
                            {
                                name: 'Bài 2: Phép tính lôgarít', value: '2', types: [
                                    { name: 'Tính giá trị biểu thức chứa lôgarít', value: '1' },
                                    { name: 'Biến đổi, biểu diễn biểu thức chứa lôgarít', value: '2' },
                                    { name: 'Rút gọn, chứng minh biểu thức lôgarít', value: '3' },
                                    { name: 'Số e và bài toán lãi kép', value: '4' },
                                    { name: 'Toán thực tế áp dụng phép tính lôgarít', value: '5' }
                                ]
                            },
                            {
                                name: 'Bài 3: Hàm số mũ. Hàm số lôgarít', value: '3', types: [
                                    { name: 'Câu hỏi lý thuyết hàm số lũy thừa, mũ, lôgarít', value: '1' },
                                    { name: 'Tập xác định của hàm số', value: '2' },
                                    { name: 'Sự biến thiên và đồ thị của hàm số mũ, lôgarít', value: '3' },
                                    { name: 'So sánh các luỹ thừa và lôgarít', value: '4' },
                                    { name: 'Toán thực tế áp dụng hàm số mũ, lôgarít', value: '5' }
                                ]
                            },
                            {
                                name: 'Bài 4: Phương trình, bất phương trình mũ và lôgarít', value: '4', types: [
                                    { name: 'Điều kiện có nghiệm', value: '1' },
                                    { name: 'Phương trình mũ, lôgarít cơ bản', value: '2' },
                                    { name: 'Bất phương trình mũ, lôgarít cơ bản', value: '3' },
                                    { name: 'Phương trình mũ, lôgarít đưa về cùng cơ số', value: '4' },
                                    { name: 'Bất phương trình mũ, lôgarít đưa về cùng cơ số', value: '5' },
                                    { name: 'Toán thực tế áp dụng phương trình mũ, lôgarít', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 5: Các phương pháp giải được giảm tải', value: '5', types: [
                                    { name: 'Phương pháp đặt ẩn phụ cho PT mũ, lôgarít', value: '1' },
                                    { name: 'Phương pháp lôgarít hóa, mũ cho PT mũ, lôgarít', value: '2' },
                                    { name: 'Phương pháp hàm số, đánh giá cho PT mũ, lôgarít', value: '3' },
                                    { name: 'Hệ PT mũ, lôgarít', value: '4' },
                                    { name: 'Toán thực tế áp dụng phương trình mũ, lôgarít', value: '5' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Đạo hàm', value: '1', types: [
                                    { name: 'Tính đạo hàm bằng định nghĩa', value: '1' },
                                    { name: 'Số gia hàm số, số gia biến số', value: '2' },
                                    { name: 'Ý nghĩa Hình học của đạo hàm', value: '3' },
                                    { name: 'Ý nghĩa Vật lý của đạo hàm', value: '4' },
                                    { name: 'Toán thực tế khác áp dụng định nghĩa đạo hàm', value: '5' }
                                ]
                            },
                            {
                                name: 'Bài 2: Các quy tắc đạo hàm', value: '2', types: [
                                    { name: 'Tính đạo hàm', value: '1' },
                                    { name: 'Đẳng thức có y và y\' ', value: '2' },
                                    { name: 'Tiếp tuyến tại một điểm', value: '3' },
                                    { name: 'Tiếp tuyến biết trước hệ số góc', value: '4' },
                                    { name: 'Tiếp tuyến chưa biết tiếp điểm và hệ số góc', value: '5' },
                                    { name: 'Giới hạn hàm số lượng giác, hàm số mũ, lôgarít', value: '6' },
                                    { name: 'Dùng đạo hàm cho nhị thức Newton', value: '7' },
                                    { name: 'Toán thực tế áp dụng quy tắc đạo hàm', value: '8' }
                                ]
                            },
                            {
                                name: 'Bài 3: Đạo hàm cấp hai', value: '3', types: [
                                    { name: 'Tính đạo hàm cấp hai', value: '1' },
                                    { name: 'Đẳng thức có y và (y\', y\'\')', value: '2' },
                                    { name: 'Toán thực tế và Ý nghĩa Vật lý của đạo hàm cấp hai', value: '3' }
                                ]
                            }
                        ]
                    ]
                },
                H: {
                    chapters: [
                        { name: 'Chương 4. Đường thẳng, mặt phẳng. Quan hệ song song trong không gian', value: '4' },
                        { name: 'Chương 8. Quan hệ vuông góc trong không gian', value: '8' }
                    ],
                    lessons: [
                        [
                            {
                                name: 'Bài 1: Điểm, đường thẳng và mặt phẳng', value: '1', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Hình biểu diễn của một hình không gian', value: '2' },
                                    { name: 'Tìm giao tuyến của hai mặt phẳng', value: '3' },
                                    { name: 'Tìm giao điểm của đường thẳng và mặt phẳng', value: '4' },
                                    { name: 'Xác định thiết diện', value: '5' },
                                    { name: 'Ba điểm thẳng hàng, ba đường thẳng đồng quy', value: '6' },
                                    { name: 'Toán thực tế áp dụng điểm, đường thẳng và mặt phẳng', value: '7' }
                                ]
                            },
                            {
                                name: 'Bài 2: Hai đường thẳng song song', value: '2', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Hai đường thẳng song song', value: '2' },
                                    { name: 'Tìm giao tuyến bằng cách kẻ song song', value: '3' },
                                    { name: 'Tìm giao điểm của đường thẳng và mặt phẳng', value: '4' },
                                    { name: 'Xác định thiết diện bằng cách kẻ song song', value: '5' },
                                    { name: 'Ba điểm thẳng hàng', value: '6' },
                                    { name: 'Bài toán quỹ tích và điểm cố định', value: '7' },
                                    { name: 'Toán thực tế áp dụng hai đường thẳng song song', value: '8' }
                                ]
                            },
                            {
                                name: 'Bài 3: Đường thẳng và mặt phẳng song song', value: '3', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Đường thẳng song song với mặt phẳng', value: '2' },
                                    { name: 'Tìm giao tuyến bằng cách kẻ song song', value: '3' },
                                    { name: 'Tìm giao điểm của đường thẳng và mặt phẳng', value: '4' },
                                    { name: 'Xác định thiết diện bằng cách kẻ song song', value: '5' },
                                    { name: 'Ba điểm thẳng hàng', value: '6' },
                                    { name: 'Bài toán quỹ tích và điểm cố định', value: '7' },
                                    { name: 'Toán thực tế áp dụng đường thẳng song song mặt phẳng', value: '8' }
                                ]
                            },
                            {
                                name: 'Bài 4: Hai mặt phẳng song song', value: '4', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Hai mặt phẳng song song', value: '2' },
                                    { name: 'Chứng minh đường thẳng song song mặt phẳng', value: '3' },
                                    { name: 'Xác định mặt phẳng đi qua một điểm và song song với một mặt phẳng', value: '4' },
                                    { name: 'Xác định mặt phẳng chứa đường thẳng (hoặc đi qua hai điểm) và song song với một mặt phẳng', value: '5' },
                                    { name: 'Bài toán tổng hợp', value: '6' },
                                    { name: 'Toán thực tế áp dụng hai mặt phẳng song song', value: '7' }
                                ]
                            },
                            {
                                name: 'Bài 5: Hình lăng trụ và hình hộp (xiên)', value: '5', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Bài toán về hình lăng trụ (xiên)', value: '2' },
                                    { name: 'Bài toán về hình hộp (xiên)', value: '3' },
                                    { name: 'Toán thực tế áp dụng hình lăng trụ và hình hộp', value: '4' }
                                ]
                            },
                            {
                                name: 'Bài 6: Phép chiếu song song', value: '6', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Hình biểu diễn của một hình không gian', value: '2' },
                                    { name: 'Xác định yếu tố song song', value: '3' },
                                    { name: 'Xác định phương chiếu', value: '4' },
                                    { name: 'Tính tỉ số đoạn thẳng, diện tích qua phép chiếu', value: '5' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Hai đường thẳng vuông góc', value: '1', types: [
                                    { name: 'Câu hỏi lí thuyết', value: '1' },
                                    { name: 'Xác định hai đường thẳng vuông góc', value: '2' },
                                    { name: 'Tìm góc giữa hai đường thẳng', value: '3' },
                                    { name: 'Toán thực tế áp dụng hai đường thẳng vuông góc', value: '4' }
                                ]
                            },
                            {
                                name: 'Bài 2: Đường thẳng vuông góc với mặt phẳng', value: '2', types: [
                                    { name: 'Câu hỏi lí thuyết', value: '1' },
                                    { name: 'Xác định hoặc chứng minh đường thẳng và mặt phẳng vuông góc', value: '2' },
                                    { name: 'Xác định hoặc chứng minh hai đường thẳng vuông góc', value: '3' },
                                    { name: 'Dựng mặt phẳng, tìm thiết diện', value: '4' },
                                    { name: 'Hình chiếu vuông góc của một hình trên mặt phẳng (tìm điểm, tìm đoạn thẳng, tính diện tích)', value: '5' },
                                    { name: 'Toán thực tế áp dụng đường thẳng vuông góc mặt phẳng', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 3: Phép chiếu vuông góc', value: '3', types: [
                                    { name: 'Lý thuyết về phép chiếu vuông góc', value: '1' },
                                    { name: 'Hình chiếu vuông góc của đa giác trên mặt phẳng', value: '2' },
                                    { name: 'Các bài toán thực tế áp dụng phép chiếu vuông góc', value: '3' }
                                ]
                            },
                            {
                                name: 'Bài 4: Hai mặt phẳng vuông góc', value: '4', types: [
                                    { name: 'Câu hỏi lí thuyết', value: '1' },
                                    { name: 'Xác định/chứng minh đường thẳng vuông góc mặt phẳng, mặt phẳng vuông góc', value: '2' },
                                    { name: 'Xác định góc giữa hai mặt phẳng', value: '3' },
                                    { name: 'Dựng mặt phẳng, thiết diện', value: '4' },
                                    { name: 'Nhận dạng và tính toán liên quan các hình thông dụng', value: '5' },
                                    { name: 'Bài toán cho trước góc giữa d và (P)', value: '6' },
                                    { name: 'Toán thực tế áp dụng hai mặt phẳng vuông góc', value: '7' }
                                ]
                            },
                            {
                                name: 'Bài 5: Khoảng cách', value: '5', types: [
                                    { name: 'Câu hỏi lí thuyết', value: '1' },
                                    { name: 'Khoảng cách giữa 2 điểm, từ 1 điểm đến 1 đường thẳng', value: '2' },
                                    { name: 'Khoảng cách từ một điểm đến một mặt phẳng', value: '3' },
                                    { name: 'Khoảng cách giữa hai đường thẳng chéo nhau', value: '4' },
                                    { name: 'Đường vuông góc chung của hai đường thẳng chéo nhau', value: '5' },
                                    { name: 'Toán thực tế áp dụng khoảng cách', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 6: Góc giữa đường thẳng và mặt phẳng. Góc nhị diện', value: '6', types: [
                                    { name: 'Góc giữa đường thẳng và mặt phẳng', value: '1' },
                                    { name: 'Góc nhị diện, góc phẳng nhị diện', value: '2' },
                                    { name: 'Góc giữa 2 mặt phẳng, biết trước góc (d,(P))', value: '3' },
                                    { name: 'Khoảng cách giữa điểm, đường, biết trước góc (d,(P))', value: '4' },
                                    { name: 'Khoảng cách giữa điểm - mặt phẳng, biết trước góc (d,(P))', value: '5' },
                                    { name: 'Khoảng cách giữa 2 đường chéo nhau, biết trước góc (d,(P))', value: '6' },
                                    { name: 'Toán thực tế về góc đường thẳng, mặt phẳng, góc nhị diện', value: '7' }
                                ]
                            },
                            {
                                name: 'Bài 7: Hình lăng trụ đứng. Hình chóp đều. Thể tích', value: '7', types: [
                                    { name: 'Câu hỏi lí thuyết, công thức', value: '1' },
                                    { name: 'Thể tích khối chóp tam giác', value: '2' },
                                    { name: 'Thể tích khối chóp tứ giác', value: '3' },
                                    { name: 'Thể tích khối lăng trụ tam giác', value: '4' },
                                    { name: 'Thể tích khối lăng trụ tứ giác', value: '5' },
                                    { name: 'Thể tích khối chóp cụt và các khối khác', value: '6' },
                                    { name: 'Tỉ số thể tích', value: '7' },
                                    { name: 'Ứng dụng thể tích tính góc, khoảng cách,...', value: '8' },
                                    { name: 'Toán thực tế hình lăng trụ đứng, chóp đều, thể tích', value: '9' }
                                ]
                            }
                        ]
                    ]
                },
                X: {
                    chapters: [
                        { name: 'Chương 5. Các số đặc trưng đo xu thế trung tâm cho mẫu số liệu ghép nhóm', value: '5' },
                        { name: 'Chương 9. Xác suất', value: '9' }
                    ],
                    lessons: [
                        [
                            {
                                name: 'Bài 1: Số trung bình và mốt của mẫu số liệu ghép nhóm', value: '1', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Mẫu số liệu ghép nhóm', value: '2' },
                                    { name: 'Số trung bình', value: '3' },
                                    { name: 'Mốt', value: '4' }
                                ]
                            },
                            {
                                name: 'Bài 2: Trung vị và tứ phân vị của mẫu số liệu ghép nhóm', value: '2', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Trung vị', value: '2' },
                                    { name: 'Tứ phân vị', value: '3' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Biến cố giao và quy tắc nhân xác suất', value: '1', types: [
                                    { name: 'Câu hỏi lí thuyết', value: '1' },
                                    { name: 'Xác định và đếm số phần tử biến cố giao', value: '2' },
                                    { name: 'Công thức nhân xác suất cho 2 biến cố độc lập', value: '3' },
                                    { name: 'Tính xác suất biến cố giao bằng sơ đồ hình cây', value: '4' }
                                ]
                            },
                            {
                                name: 'Bài 2: Biến cố hợp và quy tắc cộng xác suất', value: '2', types: [
                                    { name: 'Câu hỏi lí thuyết', value: '1' },
                                    { name: 'Xác định và đếm số phần tử biến cố hợp', value: '2' },
                                    { name: 'Quy tắc cộng cho hai biến cố xung khắc', value: '3' },
                                    { name: 'Quy tắc cộng cho hai biến cố bất kì', value: '4' },
                                    { name: 'Tính xác suất biến cố hợp bằng sơ đồ hình cây', value: '5' }
                                ]
                            }
                        ]
                    ]
                }
            },
            2: {
                D: {
                    chapters: [
                        { name: 'Chương 1. Ứng dụng đạo hàm để khảo sát hàm số', value: '1' },
                        { name: 'Chương 4. Nguyên hàm, tích phân và ứng dụng', value: '4' }
                    ],
                    lessons: [
                        [
                            {
                                name: 'Bài 1: Sự đồng biến và nghịch biến của hàm số', value: '1', types: [
                                    { name: 'Xét tính đơn điệu của hàm số cho bởi công thức', value: '1' },
                                    { name: 'Xét tính đơn điệu dựa vào bảng biến thiên, đồ thị', value: '2' },
                                    { name: 'Tìm tham số m để hàm số đơn điệu', value: '3' },
                                    { name: 'Ứng dụng tính đơn điệu để chứng minh bất phương trình,...', value: '4' },
                                    { name: 'Toán thực tế ứng dụng sự đồng biến nghịch biến', value: '5' }
                                ]
                            },
                            {
                                name: 'Bài 2: Cực trị của hàm số', value: '2', types: [
                                    { name: 'Tìm cực trị của hàm số cho bởi công thức', value: '1' },
                                    { name: 'Tìm cực trị dựa vào BBT, đồ thị', value: '2' },
                                    { name: 'Tìm m để hàm số đạt cực trị tại 1 điểm x0 cho trước', value: '3' },
                                    { name: 'Tìm m để hàm số, đồ thị hàm số bậc ba có cực trị thỏa mãn điều kiện', value: '4' },
                                    { name: 'Tìm m để hàm số, đồ thị hàm số trùng phương có cực trị thỏa mãn điều kiện', value: '5' },
                                    { name: 'Tìm m để hàm số, đồ thị hàm số các hàm số khác có cực trị thỏa mãn điều kiện', value: '6' },
                                    { name: 'Toán thực tế ứng dụng cực trị của hàm số', value: '7' }
                                ]
                            },
                            {
                                name: 'Bài 3: Giá trị lớn nhất và giá trị nhỏ nhất của hàm số', value: '3', types: [
                                    { name: 'GTLN, GTNN trên đoạn [a;b]', value: '1' },
                                    { name: 'GTLN, GTNN trên khoảng', value: '2' },
                                    { name: 'Sử dụng các đánh giá, bất đẳng thức cổ điển', value: '3' },
                                    { name: 'Ứng dụng GTNN, GTLN trong bài toán phương trình, bất phương trình, hệ phương trình', value: '4' },
                                    { name: 'GTLN, GTNN hàm nhiều biến', value: '5' },
                                    { name: 'Toán thực tế ứng dụng GTLN, GTNN của hàm số', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 4: Đường tiệm cận', value: '4', types: [
                                    { name: 'Bài toán xác định các đường tiệm cận của hàm số (không chứa tham số) hoặc biết BBT, đồ thị', value: '1' },
                                    { name: 'Bài toán xác định các đường tiệm cận của hàm số có chứa tham số', value: '2' },
                                    { name: 'Bài toán liên quan đến đồ thị hàm số và các đường tiệm cận', value: '3' },
                                    { name: 'Toán thực tế ứng dụng tiệm cận', value: '4' }
                                ]
                            },
                            {
                                name: 'Bài 5: Khảo sát sự biến thiên và vẽ đồ thị hàm số', value: '5', types: [
                                    { name: 'Nhận dạng đồ thị', value: '1' },
                                    { name: 'Các phép biến đổi đồ thị', value: '2' },
                                    { name: 'Biện luận số giao điểm dựa vào đồ thị, bảng biến thiên', value: '3' },
                                    { name: 'Sự tương giao của hai đồ thị (liên quan đến tọa độ giao điểm)', value: '4' },
                                    { name: 'Đồ thị của hàm đạo hàm', value: '5' },
                                    { name: 'Phương trình tiếp tuyến của đồ thị hàm số', value: '6' },
                                    { name: 'Điểm đặc biệt của đồ thị hàm số', value: '7' },
                                    { name: 'Toán thực tế ứng dụng khảo sát hàm số', value: '8' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Nguyên hàm', value: '1', types: [
                                    { name: 'Công thức lý thuyết', value: '1' },
                                    { name: 'Nguyên hàm cơ bản đa thức, phân thức', value: '2' },
                                    { name: 'Nguyên hàm cơ bản hàm lượng giác', value: '3' },
                                    { name: 'Nguyên hàm cơ bản hàm mũ, luỹ thừa', value: '4' },
                                    { name: 'Phương pháp đổi biến số cơ bản', value: '5' },
                                    { name: 'Toán thực tế áp dụng nguyên hàm', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 2: Tích phân', value: '2', types: [
                                    { name: 'Công thức lý thuyết', value: '1' },
                                    { name: 'Tích phân cơ bản đa thức, phân thức', value: '2' },
                                    { name: 'Tích phân cơ bản hàm lượng giác', value: '3' },
                                    { name: 'Tích phân cơ bản hàm mũ, luỹ thừa', value: '4' },
                                    { name: 'Phương pháp đổi biến số cơ bản', value: '5' },
                                    { name: 'Toán thực tế áp dụng nguyên hàm', value: '6' }
                                ]
                            },
                            {
                                name: 'Bài 3: Ứng dụng thực tế và hình học của tích phân', value: '3', types: [
                                    { name: 'Diện tích hình phẳng được giới hạn bởi các đồ thị', value: '1' },
                                    { name: 'Bài toán thực tế sử dụng diện tích hình phẳng', value: '2' },
                                    { name: 'Thể tích giới hạn bởi các đồ thị (tròn xoay)', value: '3' },
                                    { name: 'Thể tích tính theo mặt cắt S(x)', value: '4' },
                                    { name: 'Bài toán thực tế và ứng dụng thể tích tròn xoay, S(x)', value: '5' }
                                ]
                            }
                        ]
                    ]
                },
                X: {
                    chapters: [
                        { name: 'Chương 3. Các số đặc trưng đo mức độ phân tán cho mẫu số liệu ghép nhóm', value: '3' },
                        { name: 'Chương 6. Một số yếu tố xác suất', value: '6' }
                    ],
                    lessons: [
                        [
                            {
                                name: 'Bài 1: Khoảng biến thiên, khoảng tứ phân vị của mẫu số liệu ghép nhóm', value: '1', types: [
                                    { name: 'Công thức lý thuyết', value: '1' },
                                    { name: 'Tìm khoảng biến thiên', value: '2' },
                                    { name: 'Tìm khoảng tứ phân vị', value: '3' },
                                    { name: 'Câu hỏi tổng hợp', value: '4' }
                                ]
                            },
                            {
                                name: 'Bài 2: Phương sai, độ lệch chuẩn của mẫu số liệu ghép nhóm', value: '2', types: [
                                    { name: 'Công thức lý thuyết', value: '1' },
                                    { name: 'Tìm phương sai, độ lệch chuẩn', value: '2' },
                                    { name: 'Câu hỏi tổng hợp', value: '3' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Xác suất có điều kiện', value: '1', types: [
                                    { name: 'Công thức lý thuyết', value: '1' },
                                    { name: 'Tính xác suất có điều kiện bằng công thức', value: '2' },
                                    { name: 'Tính xác suất có điều kiện bằng sơ đồ cây', value: '3' },
                                    { name: 'Bài toán tổng hợp', value: '4' }
                                ]
                            },
                            {
                                name: 'Bài 2: Công thức xác suất toàn phần. Công thức Bayes', value: '2', types: [
                                    { name: 'Công thức lý thuyết', value: '1' },
                                    { name: 'Tính xác suất bằng công thức xác suất toàn phần', value: '2' },
                                    { name: 'Tính xác suất bằng công thức xác suất Bayes', value: '3' },
                                    { name: 'Bài toán tổng hợp', value: '4' }
                                ]
                            }
                        ]
                    ]
                },
                H: {
                    chapters: [
                        { name: 'Chương 2. Tọa độ của véc-tơ trong không gian', value: '2' },
                        { name: 'Chương 5. Phương trình mặt phẳng, đường thẳng, mặt cầu trong không gian Oxyz', value: '5' }
                    ],
                    lessons: [
                        [
                            {
                                name: 'Bài 1: Véc-tơ và các phép toán véc-tơ trong không gian (chưa toạ độ hoá)', value: '1', types: [
                                    { name: 'Công thức lý thuyết', value: '1' },
                                    { name: 'Tổng, hiệu, tích một số với véc-tơ', value: '2' },
                                    { name: 'Tích vô hướng và ứng dụng', value: '3' },
                                    { name: 'Toán thực tế áp dụng các phép toán véc-tơ', value: '4' }
                                ]
                            },
                            {
                                name: 'Bài 2: Toạ độ của véc-tơ và các công thức', value: '2', types: [
                                    { name: 'Công thức lý thuyết', value: '1' },
                                    { name: 'Tìm tọa độ điểm', value: '2' },
                                    { name: 'Tìm tọa độ véc-tơ', value: '3' },
                                    { name: 'Công thức toạ độ của tích vô hướng và ứng dụng', value: '4' },
                                    { name: 'Công thức toạ độ của tích có hướng và ứng dụng', value: '5' },
                                    { name: 'Toán thực tế áp dụng các phép toán toạ độ hoá véc-tơ', value: '6' }
                                ]
                            }
                        ],
                        [
                            {
                                name: 'Bài 1: Phương trình mặt phẳng', value: '1', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Xác định véc-tơ pháp tuyến, cặp véc-tơ chỉ phương', value: '2' },
                                    { name: 'Viết phương trình tổng quát mặt phẳng', value: '3' },
                                    { name: 'Vị trí tương đối giữa hai mặt phẳng (song song, vuông góc)', value: '4' },
                                    { name: 'Khoảng cách điểm tới mặt phẳng', value: '5' },
                                    { name: 'Góc giữa hai mặt phẳng', value: '6' },
                                    { name: 'Toán thực tế áp dụng phương trình mặt phẳng', value: '7' }
                                ]
                            },
                            {
                                name: 'Bài 2: Phương trình đường thẳng trong không gian', value: '2', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Xác định véc-tơ chỉ phương, cặp véc-tơ pháp tuyến', value: '2' },
                                    { name: 'Viết phương trình tổng quát, chính tắc, tham số đường thẳng', value: '3' },
                                    { name: 'Vị trí tương đối giữa hai đường thẳng', value: '4' },
                                    { name: 'Vị trí tương đối giữa đường thẳng và mặt phẳng', value: '5' },
                                    { name: 'Khoảng cách điểm tới đường thẳng', value: '6' },
                                    { name: 'Góc giữa hai đường thẳng, đường thẳng và mặt phẳng', value: '7' },
                                    { name: 'Toán thực tế áp dụng phương trình đường thẳng', value: '8' }
                                ]
                            },
                            {
                                name: 'Bài 3: Phương trình mặt cầu trong không gian', value: '3', types: [
                                    { name: 'Câu hỏi lý thuyết', value: '1' },
                                    { name: 'Xác định tâm, bán kính, đường kính mặt cầu', value: '2' },
                                    { name: 'Viết phương trình tổng quát mặt cầu', value: '3' },
                                    { name: 'Toán thực tế áp dụng phương trình mặt cầu', value: '4' }
                                ]
                            }
                        ]
                    ]
                }
            }
        };

    // === LẤY CÁC PHẦN TỬ HTML ===
    const openBtn = document.getElementById('open-gan-id-btn');
    const dialog = document.getElementById('assignIdModal');
    const closeBtn = document.getElementById('closeDialogBtn'); // Dùng ID mới từ HTML
    const classSelect = document.getElementById('classSelect');
    const subjectSelect = document.getElementById('subjectSelect');
    const chapterSelect = document.getElementById('chapterSelect');
    const lessonSelect = document.getElementById('lessonSelect');
    const typeSelect = document.getElementById('typeSelect');
    const levelSelect = document.getElementById('levelSelect');
    const generatedIdContainer = document.getElementById('generatedIdContainer');
    const generatedIdInput = document.getElementById('generatedId');
    const generateAndCopyBtn = document.getElementById('generateAndCopyBtn'); // Lấy nút đã gộp
    
    // Thoát nếu không tìm thấy các phần tử cơ bản để tránh lỗi
    if (!openBtn || !dialog || !closeBtn || !generateAndCopyBtn) {
        console.warn('Không thể khởi tạo Dialog Gán ID do thiếu các phần tử HTML cơ bản.');
        return;
    }

    // === CÁC HÀM XỬ LÝ ===

    // Hàm điền dữ liệu vào một <select>
    function populateSelect(element, options) {
        element.innerHTML = '';
        if (!options) return;
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.name;
            element.appendChild(opt);
        });
    }

    // Các hàm cập nhật dropdown phụ thuộc nhau
    function updateChapters() {
        const classValue = classSelect.value;
        const subjectValue = subjectSelect.value;
        const chapters = data[classValue]?.[subjectValue]?.chapters;
        populateSelect(chapterSelect, chapters);
        updateLessons();
    }

    function updateLessons() {
        const classValue = classSelect.value;
        const subjectValue = subjectSelect.value;
        const chapterIndex = chapterSelect.selectedIndex;
        const lessons = data[classValue]?.[subjectValue]?.lessons[chapterIndex];
        populateSelect(lessonSelect, lessons);
        updateTypes();
    }

    function updateTypes() {
        const classValue = classSelect.value;
        const subjectValue = subjectSelect.value;
        const chapterIndex = chapterSelect.selectedIndex;
        const lessonIndex = lessonSelect.selectedIndex;
        const types = data[classValue]?.[subjectValue]?.lessons[chapterIndex]?.[lessonIndex]?.types;
        populateSelect(typeSelect, types);
    }

    // Hàm reset dialog về trạng thái ban đầu và làm mới dữ liệu
    function resetAndPrepareDialog() {
        classSelect.value = '0';
        subjectSelect.value = 'D';
        generatedIdContainer.style.display = 'none';
        generatedIdInput.value = '';
        updateChapters(); // Đây là chìa khóa để làm mới dữ liệu
    }

    // === GẮN CÁC SỰ KIỆN ===

    // Sự kiện MỞ dialog
    openBtn.addEventListener('click', () => {
        resetAndPrepareDialog(); // Luôn làm mới trước khi hiện
        dialog.style.display = 'block';
    });

    // Sự kiện ĐÓNG dialog
    closeBtn.addEventListener('click', () => dialog.style.display = 'none');
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dialog.style.display === 'block') {
            dialog.style.display = 'none';
        }
    });

    // Sự kiện thay đổi các dropdown
    classSelect.addEventListener('change', updateChapters);
    subjectSelect.addEventListener('change', updateChapters);
    chapterSelect.addEventListener('change', updateLessons);
    lessonSelect.addEventListener('change', updateTypes);

    // Sự kiện cho nút "Tạo & Copy"
    generateAndCopyBtn.addEventListener('click', () => {
        // --- Phần 1: Logic tạo ID ---
        let classValue = classSelect.value;
        let subjectValue = subjectSelect.value;
        let chapterValue = chapterSelect.value;
        let lessonValue = lessonSelect.value;
        let typeValue = typeSelect.value;
        let levelValue = levelSelect.value;

        if (subjectValue === "X") subjectValue = "D";

        if (!classValue || !subjectValue || !chapterValue || !lessonValue || !typeValue || !levelValue) {
            Swal.fire('Thiếu thông tin', 'Vui lòng chọn đầy đủ các mục!', 'warning');
            return;
        }
        
        const id = `%[${classValue}${subjectValue}${chapterValue}${levelValue}${lessonValue}-${typeValue}]`;
        
        // Hiển thị ID trên ô input
        generatedIdInput.value = id;
        generatedIdContainer.style.display = 'flex'; // 'flex' để căn giữa nếu cần

        // --- Phần 2: Logic copy ID ---
        navigator.clipboard.writeText(id).then(() => {
            // Hiển thị thông báo thành công
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Đã tạo và sao chép ID!',
                showConfirmButton: false,
                timer: 2000
            });
        }).catch(err => {
            console.error('Lỗi khi sao chép: ', err);
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Lỗi khi sao chép ID!',
                showConfirmButton: false,
                timer: 2000
            });
        });
    });

    // Logic kéo thả (tùy chọn nhưng hữu ích)
    let isDragging = false, dragOffsetX, dragOffsetY;
    const modalHeader = dialog.querySelector('header');
    if (modalHeader) {
        modalHeader.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = dialog.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            dialog.style.transform = 'none'; // Quan trọng để left/top hoạt động đúng
            document.addEventListener('mousemove', handleDragging);
            document.addEventListener('mouseup', stopDragging);
        });
    }
    function handleDragging(e) {
        if (isDragging) {
            dialog.style.left = `${e.clientX - dragOffsetX}px`;
            dialog.style.top = `${e.clientY - dragOffsetY}px`;
        }
    }
    function stopDragging() {
        isDragging = false;
        document.removeEventListener('mousemove', handleDragging);
        document.removeEventListener('mouseup', stopDragging);
    }
});