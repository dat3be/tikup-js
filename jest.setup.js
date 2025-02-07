// Tăng timeout cho các test
jest.setTimeout(10000);

// Tắt các log console trong quá trình test
global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
}; 